#!/bin/sh
set -eu

MODE="${1:-api}"

case "$MODE" in
  api)
    exec node dist/src/api.js
    ;;
  gateway)
    exec node dist/src/gateway.js
    ;;
  both)
    exec node dist/src/both.js
    ;;
  *)
    echo "Usage: $0 <api|gateway|both>" >&2
    exit 1
    ;;
esac
