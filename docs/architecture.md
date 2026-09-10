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
src/components/site/  the public site chrome — SiteHeader is the only header
prisma/schema.prisma  the source of truth for the data model
```

**The rule that matters:** pages, components and actions call
`src/lib/repos/*`. They do not import `prisma` directly. Repos return
Directus-era shapes (see `_shape.ts`) — that mapping is why the rule exists.

## The public site header

`src/components/site/SiteHeader.tsx` is **the** public header. There is no
other one — five hand-copied versions existed until they had visibly drifted
(the Admin button in one of them, dead Events buttons on the company page, a
campaign link that only changed one page), so anything a header needs is a prop
on this component:

| Prop | For |
|---|---|
| `navItems` | Replaces the standard nav. The event page passes its Floorplan / Matching / CV Upload buttons; implies no Events dropdown and a scrolling mobile strip. |
| `extraNavItems` | Appends to the standard nav (the company page's "Discovery Stage"). |
| `showEventsMenu` | Force the Events dropdown on or off. |
| `dark` | Dark treatment, for pages with a dark hero. |

The account cluster — Admin / Company Dashboard / Student login / Contact and
the student menu — is deliberately **not** customisable, because divergence
there is what caused the drift. The Admin button shows whenever a staff account
is signed in, on every public page or none.

`FEATURED_EVENT_LINK` at the top of that file swaps the Events dropdown for a
single campaign link ("Jobfair 2027"). One edit changes every page.

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
`our-students-cache.ts`, `homepage-cache.ts`. They are per-container and reset
on deploy — fine for one container, worth knowing before scaling out.

A cached read path needs two things, and `homepage-cache.ts` is the worked
example of both:

- **A write that invalidates it.** `/api/homepage` feeds the homepage team
  section from `users`, so every write in `app/actions/admin-users.ts` calls
  `invalidateHomepageCache()`. Without it an edit is invisible until the TTL
  lapses, which reads as a save that silently failed.
- **Cache headers that separate browser from CDN.** Put the shared-cache
  lifetime in `CDN-Cache-Control` and leave `Cache-Control` at
  `public, max-age=0, must-revalidate`. A single header carrying `s-maxage` and
  `stale-while-revalidate` but no `max-age` also lets the *browser* serve a
  stale body, for the whole SWR window, long after the server is correct.

The cache lives on `globalThis`, like the client in `lib/prisma.ts`: the route
that reads it and the actions that clear it can be bundled separately, and a
plain module variable would give each its own copy.

## Background work

`src/lib/email-job-manager.ts` runs batched email jobs in process (queued →
processing → completed, with cooldowns for SMTP rate limits). Admin UI at
`/admin/email-queue`. `src/app/api/cron/` holds endpoints meant to be hit on a
schedule.
