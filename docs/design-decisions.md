# Design decisions — very high level

## What this is

**VTK Career** (`career.vtk.be`) is the platform VTK — the engineering students'
association at KU Leuven — runs its corporate relations on. One Next.js
application serves three audiences from one database:

| Audience | Where they live | What they do |
|---|---|---|
| **Companies** | `src/app/(protected)/dashboard` | Book career-event options, order drinks, see who scanned their booth, post vacancies, browse the CV book |
| **VTK admins** | `src/app/(protected)/admin` | Run the events: companies, booths, floorplans, forms, schedules, signage, mailings, approvals |
| **Students & public** | `src/app/(public)` | Public event pages, vacancy listings, CV-book uploads, booth check-in, digital signage screens |

The yearly career-event cycle is the spine of the data model: an
`AcademicYear` holds `CareerEvent`s, companies buy `CareerEventOption`s for a
year, and almost everything else (booths, drinks, schedules, matching) hangs off
that.

## The decisions that shaped it

**1. Directus was removed; PostgreSQL is the source of truth.**
The app used to be a frontend on a Directus instance. Directus is gone — the
schema now lives in `prisma/schema.prisma` and is the documentation. Former
Directus system tables (`users`, `files`, `roles`) became first-class tables
because they held real application data. See `MIGRATION.md` for the full record.

**2. The old Directus response shapes were kept, deliberately.**
Rather than rewrite hundreds of components, `src/lib/repos/_shape.ts` maps
Prisma results back into the nested junction shapes the UI already expected
(`company.options -> [{ career_event_option_id: {...} }]`). All of that legacy
knowledge is confined to `src/lib/repos/`. It is technical debt with a fence
around it, not an accident.

**3. All database access goes through `src/lib/repos/`.**
Pages and server actions call repo functions; they do not call `prisma`
directly. That is what makes decision 2 containable.

**4. Server-first Next.js.**
App Router, React Server Components, server actions in `src/app/actions/`.
Route handlers in `src/app/api/` exist for things that genuinely need HTTP:
file serving, webhooks, OAuth callbacks, QR scanning, cron. Most routes are
`force-dynamic` — this is a data-heavy internal tool, not a static site.

**5. Three separate identities, three separate sessions.**
Company users, students, and VTK staff are distinct. Staff split further into
two roles whose names read backwards — "VTK Career" is sales, "Administrator" is
internal support — so role checks match on id, never name ([auth.md](auth.md)). Sessions are plain HMAC-signed
cookies minted in `src/lib/auth-session.ts` — no JWT library, no session table.
NextAuth is present only to speak OIDC to KU Leuven; LITUS OAuth is hand-rolled
in `src/lib/oauth.ts`.

**6. Files live on disk, not in the database.**
Uploads are UUID-named files under `UPLOADS_DIR`, with metadata rows in the
`files` table — the layout inherited from Directus, kept so the 2,236 existing
uploads did not have to move. Back up the directory together with Postgres.

**7. `DEV_ENVIRONMENT` gates unfinished features.**
Features that are demo-ready but not ship-ready are visible on
`dev.career.vtk.be` and hidden on production. Read per request via
`isDevEnvironment()`. Anything other than `"true"` counts as production, so a
missing variable hides work rather than exposing it. Currently behind this flag:
the **vacancies** job platform, and the **public floorplan**
(`/event/<name>/floorplan`, its header buttons, and
`/api/events/<slug>/floorplan`). Admin floorplan tooling — `/admin/floorplan`
and `/admin/zones` — is deliberately *not* gated, so VTK can keep preparing
floorplans on production while visitors cannot see them.

**8. Deployment is one Docker image, pushed by git.**
Push to `main` → GitHub Actions SSHes to the server → `docker compose up -d
--build`. One app container plus one Postgres container. No staging pipeline,
no orchestrator.

**9. The build is the test suite.**
There are no unit tests. A Husky **pre-push** hook runs `npm run build`, and
TypeScript is what catches mistakes. `k6/` holds load tests, run by hand.
