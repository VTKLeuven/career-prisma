# Conventions

## Database

- **Never call `prisma` outside `src/lib/repos/`.** Add or extend a repo
  function instead. Repos return the legacy Directus-shaped objects the UI
  expects; `src/lib/repos/_shape.ts` is the only place that knows about that
  translation.
- Repos start with `import "server-only"`, **never `"use server"`**. A
  `"use server"` module turns every export into a server action — a public
  POST endpoint with no auth check — the moment any client component imports
  it. Client components reach data through `src/app/actions/`, which check
  `requireAdminUser()` / the session first; `server-only` makes the build fail
  if a client imports a repo directly.
- Password hashes and token columns (reset, invite, verification, SSO) are
  left out of every query by the client-wide `omit` in `src/lib/prisma.ts`.
  `repos/credentials.ts` is the one module that opts them back in; the session
  lookups behind `getUserFromCookies()` / `getStudentFromCookies()` live in
  `repos/sessions.ts`.
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

The back office (admin and company dashboard) follows the look of VTK's Dopl
app: a neutral grey canvas, one white working panel, hairline borders instead
of shadows, a near-black primary button, and colour only where it carries
information. The tokens live in `globals.css` (`:root`, plus `canvas`,
`surface-hover`, `surface-selected`), and the shadcn primitives (button,
badge, table, card, input, select, dialog, sheet, dropdown) were restyled to
match — **regenerating one of them from shadcn reverts it to the stock look**,
so re-apply the classes if you do.

- **Shell.** `src/app/(protected)/layout.tsx` renders the sidebar on the canvas
  and the page in an inset panel that scrolls on its own. `ShellHeader` builds
  the breadcrumb from the URL (admin sections from `ADMIN_NAV_ITEMS`), so pages
  do not declare one. ⌘K / Ctrl+K opens `CommandPalette` to jump to any section.
- **Page titles.** Admin pages start with `PageHeader`
  (`src/components/admin/PageHeader.tsx`): title, one-line description and the
  page's actions — secondary outline buttons first, the one primary action last.
  Its icon comes from `ADMIN_NAV_ITEMS`, so header, sidebar and breadcrumb agree.
- **Lists.** A click on a row opens it for editing; don't add a separate edit
  button. Destructive and secondary actions appear on row hover or in a `⋯`
  menu. Ignore clicks that land on a link/button inside the row, and clicks
  bubbling up from portaled dialogs (`e.currentTarget.contains(e.target)`).
  `ResourceManager` does all of this and edits in a panel sliding in from the
  right; tables keep a sticky header inside a height-capped scroll area
  (`Table`'s `containerClassName`) so the toolbar stays in view.
- **Status pills.** Use the pastel `Badge` variants (`success`, `warning`,
  `info`, `purple`, `muted`, `destructive`) rather than solid fills.

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
**pushing to `main` deploys to `dev.career.vtk.be`** as soon as CI is green.
