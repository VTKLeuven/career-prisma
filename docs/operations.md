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

Three workflows in `.github/workflows/`:

| Workflow | Trigger | Runs on | Does |
|---|---|---|---|
| `ci.yml` (CI) | push to `main`, PRs | GitHub | `npm ci` → `prisma generate` → `npm run build` |
| `deploy-dev.yml` | CI succeeded for a push to `main` | self-hosted runner on `elise.vtk.be` | deploys that commit to `dev.career.vtk.be` |
| `deploy-production.yml` | **manual only** (Run workflow, on `main`) | GitHub, SSH to the server | deploys `main`, if CI passed for that commit |

So **pushing to `main` deploys to dev, not production.** Production only moves
when someone runs "Deploy to Production" in the Actions tab.

Both deploys run the same sequence in the server-side checkout:
`git reset --hard <sha>`, apply pending Prisma migrations, then
`docker compose up -d --build`. They reset to an exact commit rather than
`origin/main`: dev to the commit CI tested, production to the commit `main`
pointed at when the run started and the verify job checked. A push landing
mid-deploy therefore cannot sneak in untested.

`elise.vtk.be` is not reachable over SSH from GitHub, which is why the dev
deploy uses a self-hosted runner (label `elise`) instead of SSH. The runner's
user needs Docker access and must be able to `git fetch` in the dev checkout
(`APP_DIR` in `deploy-dev.yml`), which has its own `.env` with
`DEV_ENVIRONMENT=true`.

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
- `KULEUVEN_*`, `LITUS_*`, `SMTP_*`, `SENTRY_*`.

Prisma 7 keeps the connection URL in `prisma.config.ts`, not in the `datasource`
block, and that file loads `.env` explicitly because the Prisma CLI does not.
