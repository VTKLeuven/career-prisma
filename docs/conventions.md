# Conventions

## Database

- **Never call `prisma` outside `src/lib/repos/`.** Add or extend a repo
  function instead. Repos return the legacy Directus-shaped objects the UI
  expects; `src/lib/repos/_shape.ts` is the only place that knows about that
  translation.
- Schema changes go through `npx prisma migrate dev`. Do not hand-write SQL
  against the running database.
- Do not edit `prisma/migrations/00000000000000_init` — it is the captured
  baseline of the old Directus database.

## Server vs client

Server Components by default. Reach for `"use client"` only when you need
state, effects, or browser APIs. Server-only modules start with
`import "server-only"` — keep that line when you edit them.

Writes go through server actions in `src/app/actions/`. Add a route handler in
`src/app/api/` only when something genuinely needs an HTTP endpoint (file
downloads, OAuth callbacks, QR scanning, cron, external callers).

## Access control

Every admin page, action and route checks for itself — `requireAdminUser()` or
`hasCompanyPageAccess()`. There is no middleware doing it upstream. See
[auth.md](auth.md).

## UI

shadcn/ui (new-york style) on Radix, Tailwind 4, `lucide-react` for icons.
`src/components/ui/` is generated — prefer regenerating or composing over
hand-editing. Compose class names with `cn()` from `src/lib/utils.ts`.

## Feature flags

Unfinished-but-demoable work goes behind `isDevEnvironment()`
(`src/lib/dev-environment.ts`), checked at render time. Do not cache the result
across requests.

## Style

Match the surrounding file. The codebase leans on comments that explain *why* —
particularly around Directus leftovers and Prisma 7 quirks. Keep them; they are
load-bearing context, and delete them only when the reason they describe is
genuinely gone.

## Before you push

`npm run build` must pass — the pre-push hook enforces it, and it is the only
automated check in the project. There are no unit tests. And remember:
**pushing to `main` deploys to production.**
