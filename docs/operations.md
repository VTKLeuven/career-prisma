# Running, building, deploying

## Local development

```bash
cp .env.example .env     # fill in secrets
docker compose up -d database
npx prisma migrate dev
npx prisma generate
npm run dev              # Next.js with Turbopack
node scripts/seed-dev-data.mjs   # optional sample data
```

`SETUP.md` is the authoritative install guide, including the from-scratch
Docker path and the one-shot Directus import. `MIGRATION.md` records what
changed when Directus was removed.

## Commands

| Command | What |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build — **also the pre-push gate** |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npx prisma studio` | browse the database |
| `npx prisma migrate dev` | create a migration after editing the schema |

There is no test runner. `k6/` holds load-test scenarios (smoke, stress, spike,
soak, drink-ordering, QR scanning) run manually — see `k6/README.md`.

## Pre-push hook

`.husky/pre-push` runs `npm run build` and aborts the push if it fails.
`HUSKY_SKIP_BUILD=1 git push` bypasses it — emergencies only.

## Deployment

Push to `main` → `.github/workflows/main.yml` SSHes to the server →
`git reset --hard origin/main`, applies pending Prisma migrations, then
`docker compose up -d --build`.
So **merging to `main` deploys to production.** There is no manual approval
step.

Migrations run through the one-off `migration` Compose service
(`docker compose --profile tools run --rm --build migration`), which executes
`scripts/run-prisma-migrations.mjs` → `prisma migrate deploy`. It builds the
`migrator` stage of the Dockerfile, so the Prisma CLI runs from the repo's
pinned lockfile rather than whatever Node the server happens to have. Note that
`prisma generate` in the image build does **not** touch the database — it only
emits the client — so this step is what actually changes the schema.

The migration runs *before* the new image starts, and a failure aborts the
deploy with the old image still serving. That ordering is right for additive
migrations but means a **destructive** one (dropping or renaming a column the
running image still selects) breaks requests for the length of the build. Ship
those as two deploys: first the code that stops using the column, then the
migration that removes it.

This is deliberate and temporary, not an oversight: the project has a single
developer, so the fast path is worth more than a gate. A separate dev server is
planned (as of 2026-08-18, within days), after which the repo will require a
change to be deployed there before it can reach `main`. Until then, treat every
push to `main` as a release.

Two containers: `app` (port `3003` on the host) and `database` (Postgres 16,
bound to `127.0.0.1:5437`). `./uploads` is bind-mounted into the app at
`/app/directus-uploads`.

## Environment

`.env.example` is the reference list. The ones that bite:

- `DATABASE_URL` — host-side only (Prisma CLI, psql). Inside Docker the app uses
  the separate `DATABASE_HOST`/`DATABASE_USER`/… fields so passwords with URL
  metacharacters cannot corrupt a connection string.
- `AUTH_SECRET` / `NEXTAUTH_SECRET` — sign every session cookie. Rotating one
  logs everybody out.
- `DEV_ENVIRONMENT` — `"true"` only on `dev.career.vtk.be`. Passed both as a
  build arg and a runtime env var in `docker-compose.yml`; keep the two equal.
- `UPLOADS_DIR` — file storage root. Back it up with the database.
- `KULEUVEN_*`, `VTK_SSO_*`, `SMTP_*`, `SENTRY_*`. The `LITUS_*` variables are
  gone with the old VTK login — see [auth.md](auth.md).

Prisma 7 keeps the connection URL in `prisma.config.ts`, not in the `datasource`
block, and that file loads `.env` explicitly because the Prisma CLI does not.
