# Setup

This project runs on Next.js + Prisma + PostgreSQL. There is no Directus and no
external CMS: the database is the source of truth and its shape lives in
`prisma/schema.prisma`.

## New server, from scratch

Requires Docker.

```bash
git clone <repo> career && cd career
cp .env.example .env      # then fill in the secrets, see below
docker compose up -d database
# Runs the pinned Prisma CLI in a one-off Docker container.
docker compose --profile tools run --rm --build migration
mkdir -p uploads
# Linux Docker hosts: make the bind mount writable by the image's nextjs user
sudo chown -R 1001:1001 uploads
docker compose up -d --build
```

The single app container is served directly on port `3003`.

## Loading the data from the old Directus instance

One command, given an export produced by `scripts/export-directus.sh`:

```bash
./scripts/load-directus-export.sh directus-export-20260719-163031.tar.gz
```

It restores the Directus dump, converts it to the Prisma schema, loads it into
the PostgreSQL database configured by Docker Compose, and marks the baseline
migration as applied. **It drops and recreates that database**, so only run it
on a fresh install. If the app is already running, the loader stops it during
the import and starts it again after a successful load. Host-side npm
dependencies are not required; the pinned Prisma CLI runs in Docker.

The conversion runs inside a temporary `postgis/postgis` container that the
script starts and removes on its own. This is not optional: the Directus dump
contains a PostGIS geometry column, and restoring it directly into a plain
`postgres` image fails the whole `career_event_page` table with
`type "public.geometry" does not exist` — losing it silently rather than
erroring loudly. The conversion turns that column into plain `latitude` /
`longitude` floats, after which nothing needs PostGIS again.

### Uploaded files

Files are not in the database. Sync them separately:

```bash
rsync -avz <directus-host>:/vtk/directus-postgis/uploads/ ./uploads/
```

Filenames on disk are UUIDs matching the `files` table, so keep them intact.
The directory is mounted into the app container. New uploads are written there,
so include it in backups together with PostgreSQL.

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Host-side Postgres connection string used by the Prisma CLI. URL-encode special characters in its password. |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Consumed by the `database` service in `docker-compose.yml`. `POSTGRES_PASSWORD` is required and has no default. |
| `POSTGRES_PORT` | Host port for Postgres. Defaults to `5437`, bound to loopback only. |
| `APP_PORT` | Host port for the application. Defaults to `3003`. |
| `AUTH_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | Signed application sessions and NextAuth. Generate strong random secrets. |
| `NEXT_PUBLIC_APP_URL` | Public origin used in invitation and reset links. |
| `UPLOADS_DIR` | Local file storage path. Compose mounts host `./uploads` at the configured container path. |
| `KULEUVEN_*`, `LITUS_*` | OAuth providers. |
| `SMTP_*` | Outbound mail. |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | Sentry. |

Inside Docker the app uses separate `DATABASE_*` connection fields derived from
the Compose `POSTGRES_*` settings. This safely supports passwords containing URL
special characters. `DATABASE_URL` only needs to be correct for host-side work
(`prisma migrate`, `psql`).

## Working with the schema

```bash
npx prisma studio            # browse the data
npx prisma migrate dev       # create a migration after editing schema.prisma
npx prisma generate          # regenerate the client
```

Prisma 7 keeps the connection URL in `prisma.config.ts`, not in the
`datasource` block. That config also loads `.env` explicitly, because the
Prisma CLI — unlike Next.js — does not read it on its own.

The client is constructed with a driver adapter (`@prisma/adapter-pg`) in
`src/lib/prisma.ts`; Prisma 7 removed the `datasources` constructor option.

## Notes on the migration from Directus

- **`users`, `files` and `roles`** were Directus system tables (`directus_users`,
  `directus_files`, `directus_roles`) but hold real application data — 612
  company representatives, 2,236 uploads, and four roles whose UUIDs are
  compared directly in `src/lib/auth-server.ts`. They are now first-class tables.
- **Passwords carried over unchanged.** Both `users.password` and
  `students.password` are argon2id, so no password reset was needed.
- **`career_event_page.location`** was a PostGIS `geometry(Point,4326)`. It is
  now `latitude` / `longitude`. Nothing performed spatial queries — the column
  was only ever destructured into two numbers to centre a Leaflet map.
- **Foreign key columns are suffixed `_id`.** Directus named them after their
  target (`company`, `event`, `logo`), which left Prisma no free name for the
  relation and forced it into `companyCompany` / `eventCareerEvent`.
- **Dropped as dead:** `Companies` (a superseded draft holding two test rows),
  `Company_users`, `Sport_Inventory` (a different project sharing the instance),
  five empty and unreferenced tables, and two abandoned generations of the
  vacancies↔sectors join. `vacancies_vacancy_sectors` is the canonical one.
- **Directus editorial columns** (`user_created`, `user_updated`) were dropped:
  nothing in `src/` read them, and they generated ~40 foreign keys into the
  users table. `date_created` / `date_updated` were kept.
- The old per-collection `DIRECTUS_*.md` setup guides were removed. They
  described how to configure Directus collections, which no longer exists; the
  schema itself is now the documentation. They remain in git history.
