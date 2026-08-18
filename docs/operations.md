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
`git reset --hard origin/main && docker compose up -d --build`.
So **merging to `main` deploys to production.** There is no manual approval
step.

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
