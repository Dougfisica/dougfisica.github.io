#!/usr/bin/env python3
"""Monitora casas novas para alugar em Jandaia do Sul em vários portais."""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import smtplib
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
from email.message import EmailMessage
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterator


SEARCH_PATH = "/v2/integracaoApi/imovel/filtro/categoria/caracteristicas"
DEFAULT_THRESHOLD = Decimal("2000")
DEFAULT_STATE = Path(__file__).with_name("estado_imoveis.json")
USER_AGENT = "MonitorImoveis/2.0 (+monitor pessoal de novos anuncios)"
TARGET_CITY = "Jandaia do Sul"

SOURCE_NAMES = {
    "hashimoto": "Hashimoto Corretor de Imóveis",
    "imobivale": "Imobivale Imóveis",
    "jol": "JOL Negócios Imobiliários",
    "ideal": "Ideal Maringá Imóveis",
}

SIMOB_SOURCES = {
    "hashimoto": {
        "host": "hashimotocorretordeimoveis.com.br",
        "site_url": "https://hashimotocorretordeimoveis.com.br",
    },
    "imobivale": {
        "host": "imobivaleimoveis.com.br",
        "site_url": "https://www.imobivaleimoveis.com.br",
    },
}

JOL_LIST_URL = (
    "https://www.jolnegociosimobiliarios.com.br/"
    "imovel/locacao/casa/jandaia-do-sul/"
)
IDEAL_LIST_URL = (
    "https://idealimoveismga.com.br/imoveis/locacao/"
    "residenciais/23-jandaia-do-sul-pr"
)


class MonitorError(RuntimeError):
    pass


@dataclass(frozen=True)
class House:
    source: str
    source_name: str
    source_id: str
    code: str
    category: str
    price: Decimal
    address: str
    neighborhood: str
    city: str
    updated_at: str
    url: str
    image_url: str = ""

    @property
    def id(self) -> str:
        """Chave única; IDs de imobiliárias diferentes podem ser iguais."""
        return f"{self.source}:{self.source_id}"

    @classmethod
    def from_simob(
        cls,
        item: dict[str, Any],
        *,
        source: str,
        site_url: str,
    ) -> "House":
        try:
            price = Decimal(str(item["valor"]))
        except (KeyError, InvalidOperation) as exc:
            raise MonitorError("Anúncio retornado sem um valor válido") from exc

        address_parts = [str(item.get("endereco", "")).strip()]
        number = str(item.get("numero", "")).strip()
        if number:
            address_parts.append(number)
        source_id = str(item.get("id", ""))
        code = str(item.get("codigo", source_id))
        image_name = str(item.get("imagem", "")).replace("\\", "/").split("/")[-1]
        image_url = ""
        if image_name and source_id:
            image_url = (
                "https://cdnmidia.simob.com.br/cdn/imovelImages/"
                f"{urllib.parse.quote(source_id)}/{urllib.parse.quote(image_name)}"
                f"?idImobiliaria={urllib.parse.quote(str(item.get('idImobiliaria', '')))}"
            )
        return cls(
            source=source,
            source_name=SOURCE_NAMES[source],
            source_id=source_id,
            code=code,
            category=str(item.get("descricaoCategoria", "")).strip(),
            price=price,
            address=", ".join(part for part in address_parts if part),
            neighborhood=str(item.get("bairro", "")).strip(),
            city=str(item.get("cidade", "")).strip(),
            updated_at=str(item.get("updatedAt", "")),
            url=f"{site_url}/imovel/exibir/{urllib.parse.quote(code)}",
            image_url=image_url,
        )


@dataclass
class CheckReport:
    results: dict[str, list[House]]
    errors: dict[str, str]
    all_houses: list[House]
    new_houses: list[House]
    first_run: bool
    updated_seen: set[str]
    updated_initialized: set[str]


def normalize_text(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value)
    ascii_text = "".join(char for char in decomposed if not unicodedata.combining(char))
    return " ".join(re.sub(r"[^a-zA-Z0-9]+", " ", ascii_text).casefold().split())


def is_house(category_or_title: str) -> bool:
    return normalize_text(category_or_title).startswith("casa")


def is_target_city(city: str) -> bool:
    return normalize_text(city) == normalize_text(TARGET_CITY)


def request_content(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: dict[str, Any] | None = None,
    timeout: int = 30,
) -> tuple[bytes, str | None]:
    request_headers = {"User-Agent": USER_AGENT}
    request_headers.update(headers or {})
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        request_headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=request_headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read(), response.headers.get_content_charset()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:300]
        raise MonitorError(f"HTTP {exc.code} ao consultar {url}: {detail}") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise MonitorError(f"Falha ao consultar {url}: {exc}") from exc


def http_json(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: dict[str, Any] | None = None,
    timeout: int = 30,
) -> dict[str, Any]:
    payload, _ = request_content(
        url, method=method, headers={"Accept": "application/json", **(headers or {})},
        body=body, timeout=timeout
    )
    try:
        result = json.loads(payload.decode("utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise MonitorError(f"Resposta JSON inválida recebida de {url}") from exc
    if not isinstance(result, dict):
        raise MonitorError(f"Formato JSON inesperado recebido de {url}")
    return result


def http_text(url: str, *, timeout: int = 30) -> str:
    payload, charset = request_content(
        url, headers={"Accept": "text/html,application/xhtml+xml"}, timeout=timeout
    )
    encodings = [charset, "utf-8", "iso-8859-1"]
    for encoding in encodings:
        if not encoding:
            continue
        try:
            return payload.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            pass
    return payload.decode("utf-8", errors="replace")


def fetch_api_config(host: str) -> tuple[str, str]:
    params_url = f"https://simob.com.br/v2/imobiliaria/site/params?host={host}"
    response = http_json(params_url)
    if not response.get("success") or not response.get("result"):
        raise MonitorError(f"O portal {host} não retornou a configuração da API")
    result = response["result"]
    return str(result["urlApi"]).rstrip("/"), str(result["tokenIntegracao"])


def fetch_simob_houses(source: str, threshold: Decimal) -> list[House]:
    config = SIMOB_SOURCES[source]
    api_url, token = fetch_api_config(config["host"])
    # Não usamos o ID da categoria: ele é diferente em cada imobiliária.
    filters = {
        "idsCategorias": [],
        "finalidade": 1,
        "ceps": [],
        "idsBairros": [],
        "rangeValue": {"min": str(threshold), "max": ""},
        "caracteristicas": [],
        "selectedOptions": {},
        "countResults": False,
        "considerarPrevisaoSaida": False,
        "calcularValorAbono": False,
        "validade_opcao_venda": False,
        "offset": {"maxResults": 500, "firstResult": 0},
        "trazerCaracteristicas": 3,
    }
    response = http_json(
        api_url + SEARCH_PATH,
        method="POST",
        headers={"Authorization": f"Bearer {token}", "From": "site"},
        body={"data": json.dumps(filters, separators=(",", ":"))},
    )
    if not response.get("success"):
        raise MonitorError(f"A API da {SOURCE_NAMES[source]} informou falha na pesquisa")

    houses = []
    for item in response.get("result", []):
        house = House.from_simob(
            item, source=source, site_url=config["site_url"]
        )
        if is_house(house.category) and is_target_city(house.city) and house.price > threshold:
            houses.append(house)
    return houses


class JsonLdParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.documents: list[Any] = []
        self._capturing = False
        self._parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag.casefold() == "script" and attributes.get("type", "").casefold() == "application/ld+json":
            self._capturing = True
            self._parts = []

    def handle_data(self, data: str) -> None:
        if self._capturing:
            self._parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.casefold() != "script" or not self._capturing:
            return
        self._capturing = False
        try:
            self.documents.append(json.loads("".join(self._parts)))
        except json.JSONDecodeError:
            # Alguns portais têm scripts auxiliares malformados. Os anúncios
            # válidos continuam disponíveis em outros blocos JSON-LD.
            pass


def json_nodes(value: Any) -> Iterator[dict[str, Any]]:
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from json_nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from json_nodes(child)


def jsonld_nodes(page: str) -> Iterator[dict[str, Any]]:
    parser = JsonLdParser()
    parser.feed(page)
    for document in parser.documents:
        yield from json_nodes(document)


def decimal_price(value: Any) -> Decimal:
    text = str(value).strip().replace("R$", "").replace(" ", "")
    if "," in text:
        text = text.replace(".", "").replace(",", ".")
    try:
        return Decimal(text)
    except InvalidOperation as exc:
        raise MonitorError(f"Valor de aluguel inválido: {value}") from exc


def neighborhood_from_url(url: str) -> str:
    slug = urllib.parse.urlparse(url).path.rstrip("/").split("/")[-1]
    return " ".join(word.capitalize() for word in slug.replace("-", " ").split())


def page_count(page: str, parameter: str) -> int:
    numbers = [int(value) for value in re.findall(rf"[?&]{re.escape(parameter)}=(\d+)", page)]
    return max(numbers, default=1)


def fetch_jol_houses(threshold: Decimal) -> list[House]:
    pages = [http_text(JOL_LIST_URL)]
    for number in range(2, page_count(pages[0], "pag") + 1):
        pages.append(http_text(f"{JOL_LIST_URL}?pag={number}"))

    houses: dict[str, House] = {}
    for page in pages:
        for node in jsonld_nodes(page):
            if normalize_text(str(node.get("@type", ""))) != "rentaction":
                continue
            obj = node.get("object", {})
            address = obj.get("address", {}) if isinstance(obj, dict) else {}
            title = html.unescape(str(obj.get("name", "")))
            url = str(obj.get("url", ""))
            city = str(address.get("addressLocality", ""))
            match = re.search(r"/imovel/(\d+)/", url)
            if not match or not is_house(title) or not is_target_city(city):
                continue
            price = decimal_price(node.get("price", ""))
            if price <= threshold:
                continue
            source_id = match.group(1)
            houses[source_id] = House(
                source="jol", source_name=SOURCE_NAMES["jol"], source_id=source_id,
                code=source_id, category="Casa", price=price, address="",
                neighborhood=neighborhood_from_url(url), city=city, updated_at="", url=url,
                image_url=str(obj.get("image", "")),
            )
    return list(houses.values())


def fetch_ideal_houses(threshold: Decimal) -> list[House]:
    pages = [http_text(IDEAL_LIST_URL)]
    for number in range(2, page_count(pages[0], "pagina") + 1):
        pages.append(http_text(f"{IDEAL_LIST_URL}?pagina={number}"))

    houses: dict[str, House] = {}
    for page in pages:
        for node in jsonld_nodes(page):
            if normalize_text(str(node.get("@type", ""))) != "realestatelisting":
                continue
            title = str(node.get("name", ""))
            url = str(node.get("url", ""))
            offers = node.get("offers", {})
            place = offers.get("availableAtOrFrom", {}) if isinstance(offers, dict) else {}
            address = place.get("address", {}) if isinstance(place, dict) else {}
            city = str(address.get("addressLocality", ""))
            match = re.search(r"/imovel/(\d+)/", url)
            if not match or not is_house(title) or not is_target_city(city):
                continue
            price = decimal_price(offers.get("price", ""))
            if price <= threshold:
                continue
            source_id = match.group(1)
            houses[source_id] = House(
                source="ideal", source_name=SOURCE_NAMES["ideal"], source_id=source_id,
                code=source_id, category="Casa", price=price, address="",
                neighborhood=neighborhood_from_url(url), city=city, updated_at="", url=url,
                image_url=str(node.get("image", "")),
            )
    return list(houses.values())


def fetch_all_sources(
    threshold: Decimal,
) -> tuple[dict[str, list[House]], dict[str, str]]:
    collectors = {
        "hashimoto": lambda: fetch_simob_houses("hashimoto", threshold),
        "imobivale": lambda: fetch_simob_houses("imobivale", threshold),
        "jol": lambda: fetch_jol_houses(threshold),
        "ideal": lambda: fetch_ideal_houses(threshold),
    }
    results: dict[str, list[House]] = {}
    errors: dict[str, str] = {}
    for source, collector in collectors.items():
        try:
            results[source] = collector()
        except (MonitorError, OSError, ValueError) as exc:
            errors[source] = str(exc)
    if not results:
        details = "; ".join(f"{SOURCE_NAMES[key]}: {value}" for key, value in errors.items())
        raise MonitorError(f"Nenhuma imobiliária pôde ser consultada. {details}")
    return results, errors


def load_state(path: Path) -> tuple[set[str], set[str], bool]:
    if not path.exists():
        return set(), set(), True
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        raw_ids = {str(value) for value in data.get("seen_ids", [])}
        # Migra o formato da versão 1, que monitorava apenas a Hashimoto.
        seen = {value if ":" in value else f"hashimoto:{value}" for value in raw_ids}
        initialized = {str(value) for value in data.get("initialized_sources", [])}
        if not initialized:
            initialized = {"hashimoto"}
        return seen, initialized, False
    except (OSError, json.JSONDecodeError, TypeError) as exc:
        raise MonitorError(f"Estado inválido em {path}: {exc}") from exc


def save_state(
    path: Path,
    seen_ids: set[str],
    initialized_sources: set[str],
    *,
    source_counts: dict[str, int] | None = None,
    source_errors: dict[str, str] | None = None,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    content = {
        "version": 2,
        "initialized_sources": sorted(initialized_sources),
        "seen_ids": sorted(seen_ids),
        "last_checked_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "source_counts": source_counts or {},
        "source_errors": source_errors or {},
    }
    temporary.write_text(
        json.dumps(content, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(path)


def brl(value: Decimal) -> str:
    formatted = f"{value:,.2f}"
    return "R$ " + formatted.replace(",", "X").replace(".", ",").replace("X", ".")


def build_message(houses: list[House]) -> str:
    title = "Nova casa encontrada!" if len(houses) == 1 else f"{len(houses)} novas casas encontradas!"
    blocks = [title]
    for house in houses:
        location = " - ".join(part for part in [house.neighborhood, house.city] if part)
        lines = [f"{house.category.title()} - {brl(house.price)}", f"Fonte: {house.source_name}"]
        if house.address:
            lines.append(house.address)
        if location:
            lines.append(location)
        lines.extend([f"Código: {house.code}", house.url])
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks)


def notify_telegram(message: str) -> bool:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token and not chat_id:
        return False
    if not token or not chat_id:
        raise MonitorError("Defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID juntos")
    http_json(
        f"https://api.telegram.org/bot{token}/sendMessage", method="POST",
        body={"chat_id": chat_id, "text": message, "disable_web_page_preview": False},
    )
    return True


def notify_email(message: str) -> bool:
    host = os.getenv("SMTP_HOST")
    recipient = os.getenv("EMAIL_TO")
    if not host and not recipient:
        return False
    if not host or not recipient:
        raise MonitorError("Defina ao menos SMTP_HOST e EMAIL_TO para usar e-mail")
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    sender = os.getenv("EMAIL_FROM", username or recipient)
    email = EmailMessage()
    email["Subject"] = "Nova casa para alugar em Jandaia do Sul"
    email["From"], email["To"] = sender, recipient
    email.set_content(message)
    if os.getenv("SMTP_SSL", "").lower() in {"1", "true", "sim"}:
        smtp: smtplib.SMTP = smtplib.SMTP_SSL(host, port, timeout=30)
    else:
        smtp = smtplib.SMTP(host, port, timeout=30)
    with smtp:
        if not isinstance(smtp, smtplib.SMTP_SSL):
            smtp.starttls()
        if username:
            smtp.login(username, password)
        smtp.send_message(email)
    return True


def inspect_updates(
    state_path: Path, threshold: Decimal, alert_existing: bool = False
) -> CheckReport:
    results, errors = fetch_all_sources(threshold)
    seen, initialized, first_run = load_state(state_path)
    successful_sources = set(results)
    all_houses = [house for houses in results.values() for house in houses]
    new_houses = [
        house for house in all_houses
        if house.id not in seen and (house.source in initialized or alert_existing)
    ]
    updated_seen = seen | {house.id for house in all_houses}
    updated_initialized = initialized | successful_sources

    return CheckReport(
        results=results,
        errors=errors,
        all_houses=all_houses,
        new_houses=new_houses,
        first_run=first_run,
        updated_seen=updated_seen,
        updated_initialized=updated_initialized,
    )


def commit_report(state_path: Path, report: CheckReport) -> None:
    save_state(
        state_path,
        report.updated_seen,
        report.updated_initialized,
        source_counts={key: len(value) for key, value in report.results.items()},
        source_errors=report.errors,
    )


def run_once(state_path: Path, threshold: Decimal, alert_existing: bool) -> int:
    report = inspect_updates(state_path, threshold, alert_existing)
    results = report.results
    errors = report.errors
    all_houses = report.all_houses
    new_houses = report.new_houses
    first_run = report.first_run

    for source, error in errors.items():
        print(f"Aviso: falha ao consultar {SOURCE_NAMES[source]}: {error}", file=sys.stderr)

    if not new_houses:
        commit_report(state_path, report)
        if first_run:
            print(
                f"Primeira verificação concluída: {len(all_houses)} casa(s) atual(is) "
                "registrada(s), sem alerta retroativo."
            )
        else:
            counts = ", ".join(f"{SOURCE_NAMES[key]}: {len(value)}" for key, value in results.items())
            print(f"Nenhuma casa nova encontrada. Resultados atuais — {counts}.")
        return 1 if errors else 0

    message = build_message(sorted(new_houses, key=lambda house: (house.source_name, house.price)))
    print(message)
    telegram_sent = notify_telegram(message)
    email_sent = notify_email(message)
    commit_report(state_path, report)
    channels = [name for name, sent in (("Telegram", telegram_sent), ("e-mail", email_sent)) if sent]
    if channels:
        print("\nAlerta enviado por " + " e ".join(channels) + ".")
    else:
        print("\nNenhum canal externo configurado; alerta exibido apenas no terminal.")
    return 1 if errors else 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Avisa quando surgir uma casa para alugar em Jandaia do Sul acima do valor definido."
    )
    parser.add_argument("--estado", type=Path, default=DEFAULT_STATE)
    parser.add_argument("--valor", type=Decimal, default=DEFAULT_THRESHOLD)
    parser.add_argument(
        "--alertar-existentes", action="store_true",
        help="alerta também os anúncios atuais que ainda não estiverem no histórico",
    )
    parser.add_argument("--loop", action="store_true", help="verifica novamente a cada 24 horas")
    parser.add_argument(
        "--intervalo", type=int, default=86400,
        help="intervalo do loop em segundos (padrão: 86400)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.valor < 0 or args.intervalo < 60:
        print("Erro: valor deve ser positivo e intervalo deve ter ao menos 60 segundos.", file=sys.stderr)
        return 2
    while True:
        try:
            result = run_once(args.estado, args.valor, args.alertar_existentes)
        except (MonitorError, OSError, smtplib.SMTPException, ValueError) as exc:
            print(f"Erro: {exc}", file=sys.stderr)
            result = 1
        if not args.loop:
            return result
        time.sleep(args.intervalo)


if __name__ == "__main__":
    raise SystemExit(main())
