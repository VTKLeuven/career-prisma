# AGENTS.md

Instructions for AI coding agents working in this repository.
The same guidance applies to Claude Code, which reads `CLAUDE.md`.

## Read `docs/` first

**Before you plan or write anything, read [`docs/`](docs/).**
Start with [`docs/design-decisions.md`](docs/design-decisions.md) — it explains
what this project is and the handful of decisions that make the code look the
way it does. The index in [`docs/README.md`](docs/README.md) points to the rest:

- [`docs/design-decisions.md`](docs/design-decisions.md) — start here
- [`docs/architecture.md`](docs/architecture.md) — where code lives
- [`docs/data-model.md`](docs/data-model.md) — the Prisma schema, explained
- [`docs/auth.md`](docs/auth.md) — three identities, three sessions, no middleware
- [`docs/operations.md`](docs/operations.md) — build, run, deploy, env vars
- [`docs/conventions.md`](docs/conventions.md) — how to write code here

## What this project is

**VTK Career** (`career.vtk.be`) — one Next.js 16 + Prisma 7 + PostgreSQL app
serving VTK's corporate relations: an admin back office for VTK staff, a
dashboard for company representatives, and a public site for students.
Full picture in [`docs/design-decisions.md`](docs/design-decisions.md).

## The rules that are easy to break

1. **Never import `prisma` outside `src/lib/repos/`.** Repos exist to translate
   Prisma results back into the Directus-era shapes the UI still expects. Going
   around them breaks that containment.
2. **There is no middleware.** Every admin page, server action and API route
   does its own `requireAdminUser()` / `hasCompanyPageAccess()` check. If you
   add one, add the check.
3. **`main` deploys to production on push.** GitHub Actions SSHes to the server
   and rebuilds. Do not push or merge unless the user asked for it.
4. **`npm run build` is the only automated check.** No unit tests exist. The
   Husky pre-push hook runs the build; TypeScript is the safety net.
5. **`prisma/schema.prisma` is the source of truth**, not any ORM abstraction
   and certainly not Directus, which is gone. Read it rather than guessing at
   table or column names.
6. **Don't delete the "why" comments.** Explanations around Directus leftovers
   and Prisma 7 quirks are load-bearing.

## Commands

```bash
npm run dev              # dev server (Turbopack)
npm run build            # production build — also the pre-push gate
npm run lint             # ESLint
npx prisma studio        # browse the database
npx prisma migrate dev   # create a migration after editing schema.prisma
```

Postgres runs in Docker: `docker compose up -d database`.
No test runner; `k6/` holds manual load tests.

## Keeping docs honest

If you make a decision someone would otherwise have to reverse-engineer from the
code, add it to the right file in `docs/`. If you find something in `docs/` that
the code contradicts, fix the doc in the same change.
