#!/usr/bin/env python3
"""Executa o monitor e gera os dados estáticos consumidos pelo GitHub Pages."""

from __future__ import annotations

import argparse
import json
import os
import smtplib
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

import monitor_imoveis as monitor


ROOT = Path(__file__).resolve().parent
DEFAULT_STATE = ROOT / "estado_pages.json"
DEFAULT_OUTPUT = ROOT / "dados.json"


def house_json(house: monitor.House) -> dict[str, Any]:
    return {
        "id": house.id,
        "source": house.source,
        "source_name": house.source_name,
        "code": house.code,
        "category": house.category,
        "price": str(house.price),
        "price_formatted": monitor.brl(house.price),
        "address": house.address,
        "neighborhood": house.neighborhood,
        "city": house.city,
        "url": house.url,
        "image_url": house.image_url,
    }


def build_payload(report: monitor.CheckReport) -> dict[str, Any]:
    sources = [
        {
            "id": source,
            "name": name,
            "ok": source in report.results,
            "count": len(report.results.get(source, [])),
            "error": report.errors.get(source),
        }
        for source, name in monitor.SOURCE_NAMES.items()
    ]
    return {
        "ok": True,
        "repository": os.getenv("GITHUB_REPOSITORY", ""),
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "first_run": report.first_run,
        "new_count": len(report.new_houses),
        "total_count": len(report.all_houses),
        "sources": sources,
        "new_houses": [
            house_json(house)
            for house in sorted(report.new_houses, key=lambda item: (item.source_name, item.price))
        ],
        "current_houses": [
            house_json(house)
            for house in sorted(
                report.all_houses,
                key=lambda item: (item.price, item.source_name),
                reverse=True,
            )
        ],
    }


def write_json(path: Path, payload: dict[str, Any]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Atualiza os dados do painel estático.")
    parser.add_argument("--estado", type=Path, default=DEFAULT_STATE)
    parser.add_argument("--saida", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--valor", type=Decimal, default=monitor.DEFAULT_THRESHOLD)
    parser.add_argument("--alertar-existentes", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.valor < 0:
        raise SystemExit("Erro: o valor mínimo não pode ser negativo.")

    report = monitor.inspect_updates(args.estado, args.valor, args.alertar_existentes)
    for source, error in report.errors.items():
        print(f"Aviso: falha ao consultar {monitor.SOURCE_NAMES[source]}: {error}")

    if report.new_houses:
        message = monitor.build_message(
            sorted(report.new_houses, key=lambda house: (house.source_name, house.price))
        )
        print(message)
        channels = []
        if monitor.notify_telegram(message):
            channels.append("Telegram")
        if monitor.notify_email(message):
            channels.append("e-mail")
        if channels:
            print("Alerta enviado por " + " e ".join(channels) + ".")

    monitor.commit_report(args.estado, report)
    write_json(args.saida, build_payload(report))
    print(f"Painel atualizado com {len(report.all_houses)} casa(s).")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (monitor.MonitorError, OSError, smtplib.SMTPException, ValueError) as exc:
        raise SystemExit(f"Erro: {exc}") from exc
