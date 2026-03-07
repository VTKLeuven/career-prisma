#!/usr/bin/env bash
# Quick failure check (~1.5 min) – sources .env so login credentials work.
# Run: ./k6/run-quick-failure-check.sh -e BASE_URL=http://localhost:3002

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

exec k6 run "$@" "$SCRIPT_DIR/quick-failure-check.js"
