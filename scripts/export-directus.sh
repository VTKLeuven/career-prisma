#!/bin/bash
# Exports everything needed to rebuild this project on Prisma + PostgreSQL.
# Run this ON the production server where Directus lives. Read-only: it never
# writes to the Directus database.
#
# Usage (Postgres in Docker - no password needed, uses socket auth):
#   DOCKER_PG_CONTAINER=directus-db DB_USER=directus DB_NAME=directus_db ./export-directus.sh
#
# Usage (Postgres on the host):
#   DATABASE_URL='postgres://user:pass@host:5432/dbname' ./export-directus.sh
#
# Options (environment variables):
#   DOCKER_PG_CONTAINER  Run psql/pg_dump inside this Docker container. Connects
#                        over the container's unix socket, so no password is
#                        needed and passwords with shell/URL metacharacters
#                        (^ # @ / :) cannot break anything.
#   DB_USER, DB_NAME     Postgres role and database. Required with
#                        DOCKER_PG_CONTAINER. Default: directus / directus_db.
#   DB_PASSWORD          Only needed if socket auth is refused.
#   DATABASE_URL         Full connection string, for a non-Docker Postgres.
#   DIRECTUS_ENV         Path to a Directus .env, if one exists.
#   INCLUDE_SAMPLES=1    Include real sample rows. Off by default: samples
#                        contain student PII (see PII note at the end).
#   OUT_DIR              Output directory (default: ./directus-export-<stamp>).

set -euo pipefail

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${OUT_DIR:-./directus-export-$STAMP}"

# Audit log: ~1.5M rows, ~90% of the database, and useless for the migration.
# Sessions hold live auth tokens. Schema is kept for all of them, data is not.
# spatial_ref_sys is PostGIS reference data, recreated by the extension itself.
EXCLUDE_DATA=(
  directus_activity
  directus_revisions
  directus_sessions
  directus_notifications
  spatial_ref_sys
)

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
warn() { printf '  \033[33m! %s\033[0m\n' "$*"; }
die()  { printf '\n\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Resolve the database connection
# ---------------------------------------------------------------------------

say "[1/8] Resolving database connection"

# Percent-encode credentials: generated passwords routinely contain @ : / # ^
urlenc() {
  local s="$1" out="" c i
  for (( i = 0; i < ${#s}; i++ )); do
    c="${s:i:1}"
    case "$c" in
      [a-zA-Z0-9.~_-]) out+="$c" ;;
      *) out+="$(printf '%%%02X' "'$c")" ;;
    esac
  done
  printf '%s' "$out"
}

# --- Docker path: connect over the container's unix socket -------------------
# The official postgres/postgis images trust local socket connections, so no
# password is involved. This is both simpler and immune to passwords containing
# shell or URL metacharacters.
if [ -n "${DOCKER_PG_CONTAINER:-}" ]; then
  command -v docker >/dev/null || die "docker not found but DOCKER_PG_CONTAINER is set."
  docker inspect "$DOCKER_PG_CONTAINER" >/dev/null 2>&1 \
    || die "No such container: $DOCKER_PG_CONTAINER
  Running containers:
$(docker ps --format '    %-24s %s' 2>/dev/null || true)"

  PG_USER="${DB_USER:-directus}"
  PG_DB="${DB_NAME:-${DB_DATABASE:-directus_db}}"
  info "Container: $DOCKER_PG_CONTAINER  (user=$PG_USER db=$PG_DB, socket auth)"

  DOCKER_ENV=(-e "PGCONNECT_TIMEOUT=10")
  [ -n "${DB_PASSWORD:-}" ] && DOCKER_ENV+=(-e "PGPASSWORD=$DB_PASSWORD")

  PSQL()       { docker exec -i "${DOCKER_ENV[@]}" "$DOCKER_PG_CONTAINER" psql    -U "$PG_USER" -d "$PG_DB" "$@"; }
  PGDUMP()     { docker exec -i "${DOCKER_ENV[@]}" "$DOCKER_PG_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DB" "$@"; }
  PGDUMP_VER() { docker exec -i "$DOCKER_PG_CONTAINER" pg_dump --version; }

  PSQL -X -q -c 'SELECT 1' >/dev/null 2>&1 || die "Connected to the container but Postgres refused the login.
  Check the role and database name against your docker-compose.yml
  (POSTGRES_USER / POSTGRES_DB), then retry:

    DOCKER_PG_CONTAINER=$DOCKER_PG_CONTAINER DB_USER=<user> DB_NAME=<db> $0

  If the image requires a password, add DB_PASSWORD=<password>."

elif [ -z "${DATABASE_URL:-}" ]; then
  # Directus stores its own connection in DB_* vars in its .env
  if [ -z "${DIRECTUS_ENV:-}" ]; then
    for candidate in ./.env /opt/directus/.env /var/www/directus/.env \
                     /srv/directus/.env "$HOME/directus/.env"; do
      if [ -f "$candidate" ] && grep -q '^DB_' "$candidate" 2>/dev/null; then
        DIRECTUS_ENV="$candidate"
        break
      fi
    done
  fi

  if [ -n "${DIRECTUS_ENV:-}" ] && [ -f "$DIRECTUS_ENV" ]; then
    info "Reading credentials from $DIRECTUS_ENV"
    # Pull DB_* without sourcing the file (it may contain shell metacharacters).
    # Strips surrounding quotes only - passwords may legitimately contain spaces.
    db_get() {
      grep -E "^${1}=" "$DIRECTUS_ENV" | head -1 | cut -d= -f2- \
        | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \
              -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
    }
    DB_HOST="$(db_get DB_HOST)";     DB_PORT="$(db_get DB_PORT)"
    DB_DATABASE="$(db_get DB_DATABASE)"
    DB_USER="$(db_get DB_USER)";     DB_PASSWORD="$(db_get DB_PASSWORD)"

    DATABASE_URL="postgres://$(urlenc "$DB_USER"):$(urlenc "$DB_PASSWORD")@${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_DATABASE}"
  fi
fi

# --- Host path: connect over TCP with a URL ----------------------------------
if [ -z "${DOCKER_PG_CONTAINER:-}" ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    die "Could not find database credentials.

  If Postgres runs in Docker (check with: docker ps):
    DOCKER_PG_CONTAINER=<container> DB_USER=<user> DB_NAME=<db> $0

  If Postgres runs on this host:
    DATABASE_URL='postgres://user:pass@localhost:5432/dbname' $0
    DIRECTUS_ENV=/path/to/directus/.env $0"
  fi

  command -v psql    >/dev/null || die "psql not found. Install postgresql-client, or set DOCKER_PG_CONTAINER."
  command -v pg_dump >/dev/null || die "pg_dump not found. Install postgresql-client, or set DOCKER_PG_CONTAINER."
  PSQL()       { PGCONNECT_TIMEOUT=10 psql "$DATABASE_URL" "$@"; }
  PGDUMP()     { pg_dump "$DATABASE_URL" "$@"; }
  PGDUMP_VER() { pg_dump --version; }

  PSQL -X -q -c 'SELECT 1' >/dev/null 2>&1 \
    || die "Cannot connect to the database. Check DATABASE_URL.
  Note: a password containing # @ / : must be percent-encoded in the URL
  (# becomes %23), or use the DOCKER_PG_CONTAINER form instead."
fi

# Quiet, tuple-only psql for machine-readable output
Q() { PSQL -X -q -t -A -F$'\t' -v ON_ERROR_STOP=1 "$@"; }

PG_VERSION="$(Q -c 'SHOW server_version')"
DB_SIZE="$(Q -c 'SELECT pg_size_pretty(pg_database_size(current_database()))')"
DB_NAME="$(Q -c 'SELECT current_database()')"
info "Connected to '$DB_NAME' (PostgreSQL $PG_VERSION, $DB_SIZE)"

# pg_dump refuses to run against a server newer than itself
DUMP_MAJOR="$(PGDUMP_VER | grep -oE '[0-9]+' | head -1)"
SERVER_MAJOR="$(printf '%s' "$PG_VERSION" | grep -oE '^[0-9]+')"
if [ "${DUMP_MAJOR:-0}" -lt "${SERVER_MAJOR:-0}" ]; then
  warn "pg_dump is v$DUMP_MAJOR but the server is v$SERVER_MAJOR - the dump will fail."
  warn "Fix: run the dump inside the Postgres container instead."
  warn "     DOCKER_PG_CONTAINER=<postgres-container> $0"
fi

# PostGIS changes what the dump can be restored into, and how Prisma sees the
# geometry columns. Detect it now so the report can say the right thing.
POSTGIS_VERSION="$(Q -c "SELECT extversion FROM pg_extension WHERE extname = 'postgis'" 2>/dev/null || true)"
if [ -n "$POSTGIS_VERSION" ]; then
  RESTORE_IMAGE="postgis/postgis:${SERVER_MAJOR}-master"
  PLATFORM_FLAG="--platform linux/amd64 "   # postgis publishes amd64 only
  warn "PostGIS $POSTGIS_VERSION is installed."
  warn "This dump will NOT restore into a plain postgres image - use $RESTORE_IMAGE."
else
  RESTORE_IMAGE="postgres:${SERVER_MAJOR}"
  PLATFORM_FLAG=""
fi

mkdir -p "$OUT_DIR"/{schema,data,inspect}

# ---------------------------------------------------------------------------
# 2. Schema DDL - the exact column types, constraints and foreign keys
# ---------------------------------------------------------------------------

say "[2/8] Exporting schema (DDL)"
PGDUMP --schema-only --no-owner --no-privileges > "$OUT_DIR/schema/schema.sql"
info "schema/schema.sql ($(wc -l < "$OUT_DIR/schema/schema.sql") lines)"

# ---------------------------------------------------------------------------
# 3. Directus metadata - how Directus interprets those raw tables
# ---------------------------------------------------------------------------
# This is the part a plain pg_dump does not explain. directus_fields.special
# marks which columns are m2m/o2m aliases, JSON, CSV, uuid, etc. Without it you
# cannot tell a real column from a Directus-only virtual field.

say "[3/8] Exporting Directus metadata"

dump_table_json() {
  local table="$1" out="$2"
  if [ "$(Q -c "SELECT to_regclass('public.$table') IS NOT NULL")" = "t" ]; then
    Q -c "SELECT coalesce(json_agg(t), '[]'::json) FROM $table t" > "$OUT_DIR/schema/$out"
    info "schema/$out"
  else
    warn "$table does not exist (older Directus version?), skipped"
  fi
}

dump_table_json directus_collections  collections.json
dump_table_json directus_fields       fields.json
dump_table_json directus_relations    relations.json
dump_table_json directus_roles        roles.json
dump_table_json directus_policies     policies.json
dump_table_json directus_permissions  permissions.json
dump_table_json directus_access       access.json
dump_table_json directus_flows        flows.json
dump_table_json directus_operations   operations.json
dump_table_json directus_folders      folders.json
dump_table_json directus_settings     settings.json
dump_table_json directus_presets      presets.json
dump_table_json directus_translations translations.json

# ---------------------------------------------------------------------------
# 4. Row counts
# ---------------------------------------------------------------------------

say "[4/8] Counting rows"

# Build one UNION ALL over every base table so counts are exact, not estimates
COUNT_SQL="$(Q -c "
  SELECT string_agg(
    format('SELECT %L AS tbl, count(*) AS n FROM %I', tablename, tablename),
    ' UNION ALL '
  )
  FROM pg_tables WHERE schemaname = 'public'
")"

[ -n "$COUNT_SQL" ] || die "No tables found in schema 'public'. Wrong database?"

{
  printf 'table\trows\n'
  Q -c "SELECT tbl, n FROM ($COUNT_SQL) c ORDER BY n DESC, tbl"
} > "$OUT_DIR/inspect/row-counts.tsv"

TOTAL_TABLES="$(($(wc -l < "$OUT_DIR/inspect/row-counts.tsv") - 1))"
info "inspect/row-counts.tsv ($TOTAL_TABLES tables)"

# Table sizes on disk, useful for spotting what is actually worth migrating
Q -c "
  SELECT relname, pg_size_pretty(pg_total_relation_size(c.oid))
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY pg_total_relation_size(c.oid) DESC
" > "$OUT_DIR/inspect/table-sizes.tsv"
info "inspect/table-sizes.tsv"

# ---------------------------------------------------------------------------
# 5. JSON column shapes - keys and types only, no values
# ---------------------------------------------------------------------------
# form_responses.data, form_versions.schema, orders.items, riasec_answers and
# friends are unstructured JSON blobs. Their keys are needed to model them in
# Prisma; their values are student PII. This extracts keys and value types only.

say "[5/8] Analysing JSON column shapes"

JSON_COLS="$(Q -c "
  SELECT table_name || '.' || column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND data_type IN ('json', 'jsonb')
  ORDER BY 1
")"

: > "$OUT_DIR/inspect/json-shapes.txt"
if [ -n "$JSON_COLS" ]; then
  while IFS= read -r pair; do
    [ -z "$pair" ] && continue
    tbl="${pair%%.*}"; col="${pair#*.}"
    {
      printf '\n=== %s.%s ===\n' "$tbl" "$col"
      # Identifiers are quoted: columns include reserved-ish names like "schema".
      # Arrays are unwrapped to their first element so array-of-object columns work.
      Q -c "
        WITH v AS (
          SELECT CASE
                   WHEN jsonb_typeof(\"$col\"::jsonb) = 'array' THEN \"$col\"::jsonb -> 0
                   ELSE \"$col\"::jsonb
                 END AS j
          FROM \"$tbl\"
          WHERE \"$col\" IS NOT NULL
          LIMIT 2000
        )
        SELECT DISTINCT key || '  :  ' || jsonb_typeof(value)
        FROM v, LATERAL jsonb_each(v.j)
        WHERE jsonb_typeof(v.j) = 'object'
        ORDER BY 1
      " 2>/dev/null || printf '  (not an object - scalar or mixed shape)\n'
    } >> "$OUT_DIR/inspect/json-shapes.txt"
  done <<< "$JSON_COLS"
  info "inspect/json-shapes.txt ($(echo "$JSON_COLS" | wc -l | tr -d ' ') JSON columns)"
fi

# Geometry columns need an explicit decision during the Prisma migration:
# Prisma has no native geometry type and maps them to Unsupported("geometry"),
# which cannot be selected through the client without raw SQL.
if [ -n "$POSTGIS_VERSION" ]; then
  {
    printf 'table\tcolumn\ttype\tsrid\tnon_null_rows\n'
    Q -c "
      SELECT f_table_name, f_geometry_column, type, srid, NULL
      FROM geometry_columns WHERE f_table_schema = 'public'
      ORDER BY f_table_name, f_geometry_column
    " 2>/dev/null || true
  } > "$OUT_DIR/inspect/geometry-columns.tsv"
  GEO_COUNT="$(($(wc -l < "$OUT_DIR/inspect/geometry-columns.tsv") - 1))"
  info "inspect/geometry-columns.tsv ($GEO_COUNT geometry columns)"
fi

# ---------------------------------------------------------------------------
# 6. File manifest - metadata only, not the 1.7 GB of blobs
# ---------------------------------------------------------------------------

say "[6/8] Exporting file manifest"

if [ "$(Q -c "SELECT to_regclass('public.directus_files') IS NOT NULL")" = "t" ]; then
  {
    printf 'id\tfilename_disk\tfilename_download\ttype\tfilesize\tstorage\tfolder\n'
    Q -c "
      SELECT id, filename_disk, filename_download, type,
             coalesce(filesize, 0), storage, coalesce(folder::text, '')
      FROM directus_files ORDER BY uploaded_on
    "
  } > "$OUT_DIR/data/files-manifest.tsv"

  FILE_COUNT="$(($(wc -l < "$OUT_DIR/data/files-manifest.tsv") - 1))"
  FILE_BYTES="$(Q -c 'SELECT coalesce(sum(filesize), 0) FROM directus_files')"
  info "data/files-manifest.tsv ($FILE_COUNT files, $((FILE_BYTES / 1024 / 1024)) MB of blobs NOT included)"
fi

# ---------------------------------------------------------------------------
# 7. Data dump
# ---------------------------------------------------------------------------

say "[7/8] Dumping data (this is the slow step)"

EXCLUDE_ARGS=()
for t in "${EXCLUDE_DATA[@]}"; do
  EXCLUDE_ARGS+=(--exclude-table-data="$t")
done

info "Excluding data from: ${EXCLUDE_DATA[*]}"

# Custom format: compressed, and restorable selectively with pg_restore
PGDUMP -Fc --no-owner --no-privileges "${EXCLUDE_ARGS[@]}" \
  > "$OUT_DIR/data/directus-data.dump"
info "data/directus-data.dump ($(du -h "$OUT_DIR/data/directus-data.dump" | cut -f1))"

if [ "${INCLUDE_SAMPLES:-0}" = "1" ]; then
  warn "INCLUDE_SAMPLES=1 - writing real sample rows (contains PII)"
  : > "$OUT_DIR/inspect/samples.txt"
  while IFS=$'\t' read -r tbl n; do
    [ "$tbl" = "table" ] && continue                      # header line
    case "$n" in ''|*[!0-9]*) continue ;; 0) continue ;; esac
    case "$tbl" in
      directus_activity|directus_revisions|directus_sessions|directus_notifications)
        continue ;;
    esac
    {
      printf '\n=== %s ===\n' "$tbl"
      PSQL -X -q -x -c "SELECT * FROM \"$tbl\" LIMIT 3" 2>/dev/null || true
    } >> "$OUT_DIR/inspect/samples.txt"
  done < "$OUT_DIR/inspect/row-counts.tsv"
  info "inspect/samples.txt"
fi

# ---------------------------------------------------------------------------
# 8. Report and package
# ---------------------------------------------------------------------------

say "[8/8] Writing report"

cat > "$OUT_DIR/00-REPORT.md" <<EOF
# Directus export

- Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
- Host: $(hostname)
- Database: $DB_NAME (PostgreSQL $PG_VERSION, $DB_SIZE on disk)
- PostGIS: ${POSTGIS_VERSION:-not installed}
- Tables: $TOTAL_TABLES
- Files: ${FILE_COUNT:-0} (blobs not included in this archive)
- Sample rows: $([ "${INCLUDE_SAMPLES:-0}" = "1" ] && echo "INCLUDED (contains PII)" || echo "excluded")

## Contents

| Path | What it is |
|---|---|
| \`schema/schema.sql\` | Full DDL. Column types, constraints, foreign keys. |
| \`schema/fields.json\` | Directus field metadata. \`special\` marks m2m/o2m aliases, json, csv, uuid. |
| \`schema/relations.json\` | How Directus wires the junction tables together. |
| \`schema/flows.json\`, \`operations.json\` | Business logic living inside Directus. Must be reimplemented in app code. |
| \`schema/roles.json\`, \`policies.json\`, \`permissions.json\`, \`access.json\` | Authorization model. |
| \`inspect/row-counts.tsv\` | Exact row count per table. |
| \`inspect/table-sizes.tsv\` | On-disk size per table. |
| \`inspect/json-shapes.txt\` | Keys and value types of every JSON column. No values. |
| \`data/directus-data.dump\` | pg_dump custom format. The actual data. |
| \`data/files-manifest.tsv\` | File metadata. The blobs themselves are separate, see below. |

## Restoring locally

$([ -n "$POSTGIS_VERSION" ] && printf '%s' "The source database has PostGIS $POSTGIS_VERSION, so the restore target needs it
too - a plain \`postgres\` image fails on the geometry columns.

Two things that will bite you, both verified:

1. Do NOT pass \`-e POSTGRES_DB=<name>\`. The postgis image creates that database
   from \`template_postgis\` and then collides re-creating the extension; the
   container exits with code 3 on startup. Restore into the default \`postgres\`
   database instead.
2. \`postgis/postgis\` publishes amd64 only. On Apple Silicon add
   \`--platform linux/amd64\` (Rosetta emulation) or use an \`imresamu/postgis\` tag.")

\`\`\`bash
docker run -d --name directus-copy $PLATFORM_FLAG-e POSTGRES_PASSWORD=dev -p 5433:5432 $RESTORE_IMAGE

# wait for readiness, then restore into the default 'postgres' database
docker exec -i directus-copy pg_restore -U postgres -d postgres \\
  --no-owner --no-privileges < data/directus-data.dump
\`\`\`

\`pg_restore\` reports a handful of ignored errors for extensions and schemas it
cannot recreate as a non-superuser (\`CREATE SCHEMA topology\` is the usual one).
Those are harmless - the tables and data still land. Verify with a row count.

Then point Prisma at it and introspect:

\`\`\`bash
DATABASE_URL=postgres://postgres:dev@localhost:5433/postgres npx prisma db pull
\`\`\`

Note: Prisma 7 removed \`url\` from the \`datasource\` block; it now lives in
\`prisma.config.ts\` (see below).

\`prisma.config.ts\`, required from Prisma 7 onwards:

\`\`\`ts
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: env("DATABASE_URL") },
});
\`\`\`
$([ -n "$POSTGIS_VERSION" ] && printf '%s' "
## Geometry columns

Prisma has no geometry type. Introspection produces:

\`\`\`prisma
location Unsupported(\"geometry\")?
\`\`\`

Prisma Client can neither read nor write an \`Unsupported\` field - it needs raw
SQL. See \`inspect/geometry-columns.tsv\` for the full list.

Recommended: drop PostGIS and store plain \`latitude Float?\` / \`longitude Float?\`
columns, unless something genuinely does spatial queries. That also lets the new
stack run on a plain \`postgres\` image, which builds natively on arm64.")

## Uploaded files

${FILE_COUNT:-0} files are NOT in this archive. Sync them separately:

\`\`\`bash
rsync -avz --progress <directus-host>:/path/to/directus/uploads/ ./uploads/
\`\`\`

Filenames on disk are UUIDs matching \`files-manifest.tsv\`. Keep them intact:
the app references assets by UUID.

## Row counts

\`\`\`
$(head -25 "$OUT_DIR/inspect/row-counts.tsv")
\`\`\`
EOF

info "00-REPORT.md"

ARCHIVE="${OUT_DIR%/}.tar.gz"
tar -czf "$ARCHIVE" -C "$(dirname "$OUT_DIR")" "$(basename "$OUT_DIR")"

say "Done"
info "Archive:   $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"
info "Directory: $OUT_DIR"

cat <<'EOF'

  This archive contains personal data: student names, email addresses,
  password hashes, OAuth tokens and CV form responses. Transfer it over scp,
  keep it out of git and off shared drives, and delete it when the migration
  is done.

  Next: copy it to your machine.

    scp <user>@<directus-host>:PATH_TO_ARCHIVE ./

EOF
