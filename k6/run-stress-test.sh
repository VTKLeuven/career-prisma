#!/usr/bin/env bash
# Run k6 stress test with credentials from .env
# k6 does NOT load .env automatically – this script sources it so K6_* vars are inherited.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Load .env so K6_COMPANY_REP_*, K6_STUDENT_* are available to k6
if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

# Run k6 with any extra args (e.g. -e BASE_URL=http://localhost:3003)
exec k6 run "$@" "$SCRIPT_DIR/stress-test.js"
