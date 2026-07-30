#!/bin/sh
set -eu

MODE="${1:-api}"

case "$MODE" in
  api)
    exec npm run --silent start:api
    ;;
  gateway)
    exec npm run --silent start:gateway
    ;;
  both)
    exec npm run --silent start:both
    ;;
  *)
    echo "Usage: $0 <api|gateway|both>" >&2
    exit 1
    ;;
esac
