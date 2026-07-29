#!/bin/bash
set -euo pipefail

MODE="${1:-api}"

shutdown_both() {
  if [[ -n "${api_pid:-}" ]]; then
    kill -TERM "$api_pid" 2>/dev/null || true
  fi
  if [[ -n "${gateway_pid:-}" ]]; then
    kill -TERM "$gateway_pid" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
}

run_both() {
  trap shutdown_both INT TERM

  node dist/src/api.js &
  api_pid=$!

  node dist/src/gateway.js &
  gateway_pid=$!

  wait -n "$api_pid" "$gateway_pid"
  status=$?
  shutdown_both
  exit "$status"
}

case "$MODE" in
  api)
    exec node dist/src/api.js
    ;;
  gateway)
    exec node dist/src/gateway.js
    ;;
  both)
    run_both
    ;;
  *)
    echo "Usage: $0 <api|gateway|both>" >&2
    exit 1
    ;;
esac
