#!/usr/bin/env bash
# Quick smoke test: verify student + company login work with .env credentials.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

exec k6 run "$@" "$SCRIPT_DIR/smoke-test.js"
