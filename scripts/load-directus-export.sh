#!/bin/bash
# Loads a Directus export (produced by scripts/export-directus.sh) into this
# project's PostgreSQL database, converting it to the Prisma schema on the way.
#
# Usage:
#   ./scripts/load-directus-export.sh directus-export-20260719-163031
#   ./scripts/load-directus-export.sh directus-export-20260719-163031.tar.gz
#
# The target database is taken from DATABASE_URL in .env.
#
# Why the detour through a temporary container: the Directus dump contains a
# PostGIS geometry column (career_event_page.location). Restoring it directly
# into a plain postgres image does not merely skip that column -- the whole
# CREATE TABLE fails with `type "public.geometry" does not exist`, silently
# losing the entire career_event_page table. So the conversion runs inside a
# throwaway postgis container, which turns the geometry into plain latitude and
# longitude columns; the result is then PostGIS-free and loads anywhere.
#
# Destructive: the target database is dropped and recreated.

set -euo pipefail

EXPORT="${1:-}"
TMP_CONTAINER="career-import-$$"
PGIS_IMAGE="${PGIS_IMAGE:-postgis/postgis:16-master}"

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
warn() { printf '  \033[33m! %s\033[0m\n' "$*"; }
die()  { printf '\n\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

cleanup() { docker rm -f "$TMP_CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

[ -n "$EXPORT" ] || die "Usage: $0 <export-directory-or-tarball>"

# ---------------------------------------------------------------------------
# Resolve inputs
# ---------------------------------------------------------------------------
case "$EXPORT" in
  *.tar.gz)
    [ -f "$EXPORT" ] || die "No such file: $EXPORT"
    say "Extracting $EXPORT"
    tar -xzf "$EXPORT"
    EXPORT="$(basename "${EXPORT%.tar.gz}")"
    ;;
esac

[ -d "$EXPORT" ] || die "Not a directory: $EXPORT"
DUMP="$EXPORT/data/directus-data.dump"
[ -f "$DUMP" ] || die "Dump not found: $DUMP"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATION="$ROOT/prisma/migrate-from-directus.sql"
[ -f "$MIGRATION" ] || die "Missing $MIGRATION"

command -v docker >/dev/null || die "docker is required (the conversion runs in a temporary container)"
command -v psql   >/dev/null || die "psql not found (install postgresql-client)"

# ---------------------------------------------------------------------------
# Resolve the target database from DATABASE_URL
# ---------------------------------------------------------------------------
if [ -z "${DATABASE_URL:-}" ] && [ -f "$ROOT/.env" ]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ROOT/.env" | head -1 | cut -d= -f2- \
                  | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/")"
fi
[ -n "${DATABASE_URL:-}" ] || die "DATABASE_URL is not set (checked the environment and .env)"

proto_stripped="${DATABASE_URL#*://}"
creds="${proto_stripped%%@*}"
hostpart="${proto_stripped#*@}"
DB_USER="${creds%%:*}"
DB_PASS="${creds#*:}"
hostport="${hostpart%%/*}"
DB_HOST="${hostport%%:*}"
DB_PORT="${hostport#*:}"; [ "$DB_PORT" = "$DB_HOST" ] && DB_PORT=5432
DB_NAME="${hostpart#*/}"; DB_NAME="${DB_NAME%%\?*}"

say "Target"
info "host     $DB_HOST:$DB_PORT"
info "database $DB_NAME"

export PGPASSWORD="$DB_PASS"
PSQL_ADMIN=(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL_ADMIN[@]}" -c 'SELECT 1' >/dev/null 2>&1 \
  || die "Cannot connect to $DB_HOST:$DB_PORT. Is it running? (docker compose up -d database)"

# ---------------------------------------------------------------------------
# 1. Temporary PostGIS container
# ---------------------------------------------------------------------------
say "[1/5] Starting temporary PostGIS container"
PLATFORM=""
if [ "$(uname -m)" = "arm64" ] || [ "$(uname -m)" = "aarch64" ]; then
  # postgis/postgis publishes amd64 only; emulation is fine for a one-off import
  PLATFORM="--platform linux/amd64"
  info "arm64 host detected, running the image under emulation"
fi

# shellcheck disable=SC2086
docker run -d --name "$TMP_CONTAINER" $PLATFORM \
  -e POSTGRES_PASSWORD=import "$PGIS_IMAGE" >/dev/null \
  || die "Could not start $PGIS_IMAGE"

# The official Postgres images start a throwaway server to run the init scripts,
# then shut it down and start the real one. pg_isready succeeds against that
# first server, so waiting on it alone hands back a database that is about to
# shut down. The log line appears once per server, so wait for the second.
for i in $(seq 1 240); do
  ready=$(docker logs "$TMP_CONTAINER" 2>&1 \
          | grep -c "database system is ready to accept connections" || true)
  if [ "${ready:-0}" -ge 2 ] && docker exec "$TMP_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  [ "$i" = 240 ] && die "PostGIS container did not become ready in time"
  sleep 1
done
info "ready"

# ---------------------------------------------------------------------------
# 2. Restore the Directus dump there
# ---------------------------------------------------------------------------
say "[2/5] Restoring Directus dump"
docker exec "$TMP_CONTAINER" psql -U postgres -q -c "CREATE DATABASE import" >/dev/null

set +e
docker exec -i "$TMP_CONTAINER" pg_restore -U postgres -d import \
  --no-owner --no-privileges < "$DUMP" 2>/tmp/restore_err.$$
set -e
ignored=$(grep -c "^pg_restore: error" /tmp/restore_err.$$ 2>/dev/null || true)
rm -f /tmp/restore_err.$$
info "restored (${ignored:-0} ignored errors: PostGIS tiger/topology objects, expected)"

companies=$(docker exec "$TMP_CONTAINER" psql -U postgres -d import -tAc "SELECT count(*) FROM company")
pages=$(docker exec "$TMP_CONTAINER" psql -U postgres -d import -tAc "SELECT count(*) FROM career_event_page")
[ "${companies:-0}" -gt 0 ] || die "No company rows restored -- the dump may be truncated."
info "sanity check: $companies companies, $pages event pages"

# ---------------------------------------------------------------------------
# 3. Convert to the Prisma shape
# ---------------------------------------------------------------------------
say "[3/5] Converting to the Prisma schema"
docker exec -i "$TMP_CONTAINER" psql -U postgres -d import -v ON_ERROR_STOP=1 -q \
  < "$MIGRATION" 2>&1 | grep -E "ERROR|NOTICE:  Migration" || true

geo=$(docker exec "$TMP_CONTAINER" psql -U postgres -d import -tAc \
  "SELECT count(*) FROM career_event_pages WHERE latitude IS NOT NULL")
info "converted $geo geometry points to latitude/longitude"

# ---------------------------------------------------------------------------
# 4. Move into the real database
# ---------------------------------------------------------------------------
say "[4/5] Loading into $DB_NAME"
"${PSQL_ADMIN[@]}" -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid()" >/dev/null 2>&1 || true
"${PSQL_ADMIN[@]}" -c "DROP DATABASE IF EXISTS \"$DB_NAME\""
"${PSQL_ADMIN[@]}" -c "CREATE DATABASE \"$DB_NAME\""

# The converted database no longer contains any PostGIS objects, so this dump
# restores cleanly into a stock postgres image.
docker exec "$TMP_CONTAINER" pg_dump -U postgres -d import --no-owner --no-privileges \
  | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q >/dev/null
info "loaded"

# ---------------------------------------------------------------------------
# 5. Baseline and apply Prisma migrations
# ---------------------------------------------------------------------------
# The tables already exist, so `prisma migrate deploy` must not try to create
# them. Resolving the baseline records it as applied without running it.
say "[5/5] Baselining and applying Prisma migrations"
( cd "$ROOT" && \
  npx prisma migrate resolve --applied 00000000000000_init >/dev/null && \
  npx prisma migrate deploy ) || \
  die "Could not apply Prisma migrations"

say "Loaded"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAF'  ' -c "
SELECT 'companies', count(*) FROM companies
UNION ALL SELECT 'users', count(*) FROM users
UNION ALL SELECT 'students', count(*) FROM students
UNION ALL SELECT 'form_responses', count(*) FROM form_responses
UNION ALL SELECT 'career_event_pages', count(*) FROM career_event_pages
UNION ALL SELECT 'files', count(*) FROM files;" | sed 's/^/  /'

cat <<'EOF'

  Next:
    npx prisma generate
    npm run dev

  Uploaded files live outside the database. Sync them separately:
    rsync -avz <directus-host>:/vtk/directus-postgis/uploads/ ./directus-uploads/

EOF
