# Architecture

## Stack

Next.js 16 (App Router, Turbopack in dev) · React 19 · TypeScript ·
Prisma 7 + PostgreSQL 16 · Tailwind CSS 4 · shadcn/ui (new-york) on Radix ·
Sentry · Nodemailer.

`@/` resolves to `src/`.

## Layers

```
src/app/(public)      public site, login pages, booth check-in, signage screens
src/app/(protected)   sidebar layout; /admin for VTK, /dashboard for companies
src/app/actions/      server actions — the main write path
src/app/api/          route handlers: files, OAuth, QR scans, cron, webhooks
src/lib/repos/        ALL database access lives here
src/lib/              auth, email, caches, PDF/image processing, utils
src/components/ui/    shadcn primitives (generated — regenerate, don't hand-edit)
prisma/schema.prisma  the source of truth for the data model
```

**The rule that matters:** pages, components and actions call
`src/lib/repos/*`. They do not import `prisma` directly. Repos return
Directus-era shapes (see `_shape.ts`) — that mapping is why the rule exists.

## Routing notes

- `src/app/(protected)/layout.tsx` resolves the viewer from cookies and renders
  the sidebar; an unauthenticated visitor gets a sign-in prompt instead. There
  is **no `middleware.ts`** — authorization is done per page/route, not at the
  edge.
- `(protected)` is `force-dynamic` and marked `noindex`.
- Most other routes are dynamic too. Assume server rendering per request.

## Caching

Several hot read paths have hand-rolled in-process caches:
`event-page-cache.ts`, `company-page-cache.ts`, `floorplan-cache.ts`,
`our-students-cache.ts`. They are per-container and reset on deploy — fine for
one container, worth knowing before scaling out.

## Background work

`src/lib/email-job-manager.ts` runs batched email jobs in process (queued →
processing → completed, with cooldowns for SMTP rate limits). Admin UI at
`/admin/email-queue`. `src/app/api/cron/` holds endpoints meant to be hit on a
schedule.
