#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

abrir_navegador=true
if [[ "${1:-}" == "--sem-abrir" ]]; then
  abrir_navegador=false
  shift
fi

porta=8000
argumentos=("$@")
for ((i = 0; i < ${#argumentos[@]}; i++)); do
  if [[ "${argumentos[$i]}" == "--porta" ]] && ((i + 1 < ${#argumentos[@]})); then
    porta="${argumentos[$((i + 1))]}"
  fi
done

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ "$abrir_navegador" == true ]] && command -v xdg-open >/dev/null 2>&1; then
  (sleep 1; xdg-open "http://127.0.0.1:${porta}") >/dev/null 2>&1 &
fi

exec python3 painel.py "$@"
