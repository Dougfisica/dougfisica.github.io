#!/usr/bin/env python3
"""Servidor web local do painel do monitor de imóveis."""

from __future__ import annotations

import argparse
import json
import threading
from decimal import Decimal
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import monitor_imoveis as monitor


ROOT = Path(__file__).resolve().parent
INDEX_FILE = ROOT / "index.html"
CHECK_LOCK = threading.Lock()
STATE_PATH = monitor.DEFAULT_STATE


def read_status() -> dict[str, Any]:
    if not STATE_PATH.exists():
        return {
            "last_checked_at": None,
            "source_counts": {},
            "source_errors": {},
        }
    try:
        data = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"last_checked_at": None, "source_counts": {}, "source_errors": {}}
    return {
        "last_checked_at": data.get("last_checked_at"),
        "source_counts": data.get("source_counts", {}),
        "source_errors": data.get("source_errors", {}),
    }


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


def report_json(report: monitor.CheckReport) -> dict[str, Any]:
    status = read_status()
    sources = []
    for source, name in monitor.SOURCE_NAMES.items():
        sources.append({
            "id": source,
            "name": name,
            "ok": source in report.results,
            "count": len(report.results.get(source, [])),
            "error": report.errors.get(source),
        })
    return {
        "ok": True,
        "first_run": report.first_run,
        "new_count": len(report.new_houses),
        "total_count": len(report.all_houses),
        "last_checked_at": status["last_checked_at"],
        "sources": sources,
        "new_houses": [
            house_json(house)
            for house in sorted(
                report.new_houses,
                key=lambda item: (item.source_name, item.price),
            )
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


class PanelHandler(BaseHTTPRequestHandler):
    server_version = "PainelImoveis/1.0"

    def send_json(self, payload: dict[str, Any], status: int = HTTPStatus.OK) -> None:
        content = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        # Permite que o index.html aberto diretamente (file://) converse com
        # este servidor local. O painel continua vinculado apenas ao localhost.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        if path == "/":
            try:
                content = INDEX_FILE.read_bytes()
            except OSError as exc:
                self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
                return
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(content)
            return
        if path == "/api/status":
            status = read_status()
            status["sources"] = [
                {
                    "id": source,
                    "name": name,
                    "count": status["source_counts"].get(source),
                    "error": status["source_errors"].get(source),
                }
                for source, name in monitor.SOURCE_NAMES.items()
            ]
            self.send_json(status)
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        if self.path.split("?", 1)[0] != "/api/verificar":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if not CHECK_LOCK.acquire(blocking=False):
            self.send_json(
                {"ok": False, "error": "Uma verificação já está em andamento."},
                HTTPStatus.CONFLICT,
            )
            return
        try:
            report = monitor.inspect_updates(
                STATE_PATH, monitor.DEFAULT_THRESHOLD
            )
            monitor.commit_report(STATE_PATH, report)
            self.send_json(report_json(report))
        except (monitor.MonitorError, OSError, ValueError) as exc:
            self.send_json(
                {"ok": False, "error": str(exc)},
                HTTPStatus.BAD_GATEWAY,
            )
        finally:
            CHECK_LOCK.release()

    def log_message(self, format: str, *args: object) -> None:
        print(f"[{self.log_date_time_string()}] {format % args}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Abre o servidor local do painel de imóveis.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--porta", type=int, default=8000)
    parser.add_argument("--estado", type=Path, default=monitor.DEFAULT_STATE)
    return parser.parse_args()


def main() -> None:
    global STATE_PATH
    args = parse_args()
    STATE_PATH = args.estado
    server = ThreadingHTTPServer((args.host, args.porta), PanelHandler)
    print(f"Painel disponível em http://{args.host}:{args.porta}")
    print("Pressione Ctrl+C para encerrar.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando painel.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
