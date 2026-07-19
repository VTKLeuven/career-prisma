# Directus → Prisma migration: state and handoff

Branch: `prisma-migration` — 19 commits ahead of `main` (14 migration commits
plus the merged `vacancies` feature branch).

**Status: the database and every mechanical data-access repo are on Prisma.
Authentication and file uploads still go through Directus.** The app compiles
(`npx tsc --noEmit` → 0 errors) and runs; nothing is half-converted.

---

## 1. Set up a working environment first

Everything below assumes a local database loaded with the production export.
Do this before reading further — most of the traps in §5 are only visible
against real data.

```bash
docker run -d --name career-dev \
  -e POSTGRES_PASSWORD=dev -e POSTGRES_USER=career -p 5434:5432 postgres:16-alpine
# wait for "database system is ready to accept connections" TWICE in the logs
# (the image starts a throwaway server for init; pg_isready lies during that)
docker exec career-dev psql -U career -d postgres -c "CREATE DATABASE career"

DATABASE_URL="postgresql://career:dev@localhost:5434/career?schema=public" \
  ./scripts/load-directus-export.sh directus-export-20260719-163031

npx prisma generate
```

The export tarball is gitignored; ask the user for it, or regenerate with
`scripts/export-directus.sh` on the Directus host (`it@liv`,
`/vtk/directus-postgis`, container `directus-db`, db `directus_db`).

**Verification method used throughout this migration:** convert, then compare
against raw SQL or against the previous implementation's output on real data.
Typechecking alone did not catch a single one of the bugs in §5. Do the same.

---

## 2. What is done

### Database
- `prisma/schema.prisma` — 56 models, introspected from the real export then
  renamed (PascalCase models, snake_case tables via `@@map`). Scalar fields
  keep snake_case so `src/lib/schema.ts` types stay accurate.
- `prisma/migrate-from-directus.sql` — idempotent transform from a restored
  Directus dump. Verified against the 2026-07-19 export.
- `prisma/migrations/00000000000000_init/` — baseline for fresh installs.
- `scripts/export-directus.sh` — produces an export on the Directus host.
- `scripts/load-directus-export.sh` — one command from tarball to loaded DB.
- `docker-compose.yml` — `postgres:16-alpine` service; no external Directus.
- `SETUP.md` — from-scratch install.

### Repos converted (19 of 22 files in `src/lib/repos/`)
`booths` · `company` · `cv-book` · `cv-book-favourites` · `cv-book-screening` ·
`drinks` · `event` · `features` · `floorplan` · `forms` · `matching-software` ·
`option` · `orders` · `ordering-settings` · `schedule` ·
`student-liked-companies` · `vacancies` · `zones` · plus `_shape.ts`

### `src/lib/repos/_shape.ts` — read this before writing any repo code
Directus returned m2m relations as junction-wrapped arrays:

```
company.options  ->  [{ career_event_option_id: { …option } }]
company.category ->  [{ master_id: { …master } }]
```

69 files outside `src/lib/repos/` read those shapes. `_shape.ts` maps Prisma
results back into them, which is what keeps the Directus removal confined to
the repo layer. When a consumer is eventually updated to read Prisma's shape
directly, delete the mapper rather than adding a second variant.

---

## 3. What remains

### 3a. Authentication — `users.ts` (972), `students.ts` (560)

This is **not** a query rewrite. `getUserFromCookies` in `src/lib/auth-server.ts`
reads a cookie (`{AUTH_COOKIE_PREFIX|directus}_access`) and calls Directus
`readMe()` to validate it. There is no session concept in the Prisma schema, so
somebody has to decide how sessions work. Also involved:
`src/lib/auth-student.ts`, `src/lib/invite-token.ts`, `src/proxy.ts`.

What is already in place:
- **Passwords carried over unchanged and need no reset.** Both `users` (563)
  and `students` (853) are `$argon2id$`. The `argon2` package is already a
  dependency. (`bcryptjs` is also installed and imported in
  `src/app/api/students/login/route.ts`, but **no stored hash is bcrypt** —
  do not assume a split.)
- `roles` kept its original UUIDs, because code compares them directly:
  `auth-server.ts:35` hardcodes `7b128ef4-…` (VTK Career) as an admin check,
  alongside `role?.name === "Administrator"`.
- `next-auth` is already a dependency and `src/auth.ts` exists.

Note `directus_roles` has no `admin_access` column in this Directus version, so
the `role?.admin_access === true` branch in `auth-server.ts` is dead code and
the name/UUID checks are what actually run.

### 3b. File storage — `directus.ts` (765)

`src/lib/repos/directus.ts` POSTs uploads to Directus `/files` over `fetch`
(it never imported the SDK, which is why `grep @directus/sdk` undercounted it).
Prisma does not store blobs, so this needs a storage decision: local disk behind
a route, S3/MinIO, or keep Directus purely as a file server during transition.

Related: `src/app/api/files/…`, `src/app/api/upload`, `src/components/Images.tsx`,
and **6 hardcoded `https://directustest.vtk.be/assets/…` URLs** in JSX
(`grep -rn directustest.vtk.be src`). The `files` table (2,236 rows) is already
migrated and holds the metadata; only the bytes are still served by Directus.

The uploads directory (~1.6 GB, 2,236 files) syncs with:
```bash
rsync -avz it@liv:/vtk/directus-postgis/uploads/ ./directus-uploads/
```
Filenames on disk are UUIDs matching `files.filename_disk`.

### 3c. Application layer — 69 files

Once the above are done: `src/app/api/…` (42), `src/app/actions/…` (10),
`src/app/(protected)/…` (6), `src/app/(public)/…` (5), plus `src/proxy.ts`,
`src/components/Images.tsx` and the auth/token modules listed in §3a. Most are consuming repo
functions and will need little more than import changes; the API routes under
`src/app/api/files`, `upload`, `signage/media` and `admin/forms/*/download-all-files`
are the ones genuinely tied to Directus file serving.

Finally: remove `@directus/sdk` from `package.json`, delete `src/lib/directus.ts`
and `src/lib/repos/directus.ts`, and drop the `DIRECTUS_*` block from
`.env.example`.

---

## 4. Decisions already made (don't relitigate silently)

| Decision | Why |
|---|---|
| PostGIS dropped; `career_event_page.location` → `latitude`/`longitude` floats | Only ever read as two numbers for a Leaflet map; no spatial queries anywhere. Also lets the stack run on stock `postgres`, which unlike `postgis/postgis` publishes arm64 builds. |
| FK columns suffixed `_id` | Directus named them after their target (`company`, `event`, `logo`), leaving Prisma no free name for the relation and forcing `companyCompany` / `eventCareerEvent`. |
| `directus_users`/`files`/`roles` → `users`/`files`/`roles` | They hold real application data: 612 company reps, 2,236 uploads, 4 roles whose UUIDs are compared in code. |
| `user_created`/`user_updated` dropped | Directus editorial metadata; nothing in `src/` read them, and they generated ~40 FKs into the users table. `date_created`/`date_updated` kept. |
| 36 tables dropped | `Companies` (2 test rows, superseded by `company`; both FKs into it were NULL across all 5,458 scans and 374 orders), `Sport_Inventory` (different project sharing the instance), 5 empty unreferenced tables, 2 abandoned vacancies↔sectors junctions, and Directus infrastructure. |
| All JSON columns → `jsonb` | See §5.1 — this one is load-bearing. |
| Repos return legacy Directus shapes | Keeps 69 consumer files untouched. See `_shape.ts`. |

---

## 5. Traps found the hard way

These cost real time. All were found by comparing against raw SQL, never by
typechecking.

### 5.1 Prisma JSON filters fail *silently* on `json` columns
```
prisma.formResponse.findMany({ where: { data: { path: ["_student_id"], equals: 553 } } })  -> 0 rows
SELECT … WHERE data->>'_student_id' = '553'                                                -> 3 rows
```
Prisma's JSON filters compile to `jsonb` operators. Against a `json` column they
match nothing and raise nothing. All 21 columns were migrated to `jsonb` in
`migrate-from-directus.sql` step 9. **If you add a JSON column, make it `jsonb`.**
`json` also has no equality operator, so `groupBy`/`WHERE` on it is impossible.

### 5.2 Two `OR`-shaped filters cannot be spread into one object
```js
where: { …, ...NOT_ARCHIVED, ...studentIdMatch(id) }   // second OR wins, first vanishes
where: { …, AND: [NOT_ARCHIVED, studentIdMatch(id)] }  // correct
```
This silently disabled the archived filter in `forms.ts`; a student with 6
responses (4 archived) returned all 6. No error, no type complaint.

### 5.3 `data._student_id` is a JSON **number**
The original code compared it with `===` against a string-typed `studentId`.
`553 === "553"` is false; it worked only because callers happened to pass
numbers despite the annotation. Match on both representations.

### 5.4 Junction FKs are `ON DELETE SET NULL`
Directus unlinks m2m by PATCHing the alias to `[]` rather than deleting junction
rows, so each sync orphaned its predecessors instead of removing them:
`company_matching_response_students` had **106,996 of 116,037 rows orphaned (92%)**.
Cleaned up in the migration. The Prisma repos delete junction rows outright.
**The real match-link count is ~9,000, not 116k** — earlier reporting in this
project quoted the raw row count without checking it resolved.

### 5.5 Nothing cascades
Deleting a form, floorplan, zone or CV book requires clearing dependents first
(`attendant_scans`, `cv_book_favourites`, `cv_book_screenings`, `zone_booths`,
orders' `booth_id`). `deleteFloorplan` originally deleted the floorplan *then*
unlinked event pages — which only survived because Directus wasn't enforcing
the constraint.

### 5.6 Directus row-level policies are gone
Directus enforced 8 row-level rules. All but one were already duplicated in
application code (vacancy ownership checks, public reads pinned to
`status = 'published'`). The exception — `drinks.is_active` for public reads —
is now enforced in `listDrinks`. **There is no policy layer behind the repos
any more; authorization must be explicit in app code.**

### 5.7 Prisma 7 specifics
- No `url` in the `datasource` block; it lives in `prisma.config.ts`, which also
  has to load `.env` itself (the CLI doesn't).
- No `datasources` constructor option; the client needs a driver adapter
  (`@prisma/adapter-pg`) — see `src/lib/prisma.ts`.
- `prisma migrate diff` uses `--to-schema`, not `--to-schema-datamodel`.
- `prisma db pull` **preserves** manual model/field renames, so re-introspecting
  is safe. The one-time polish that produced the current names is not repeatable
  against an already-polished schema — reset the schema to just
  `generator`+`datasource` first if you ever need to redo it.

### 5.8 Environment quirks
- `postgis/postgis` publishes amd64 only — on Apple Silicon it needs
  `--platform linux/amd64`. Only relevant to the import path, which routes
  through a temporary PostGIS container because a Directus dump containing a
  geometry column **fails the whole `career_event_page` table** with
  `type "public.geometry" does not exist` when restored into stock postgres.
  It doesn't skip the column; it loses the table.
- Don't pass `-e POSTGRES_DB=<name>` to the postgis image — it creates the DB
  from `template_postgis` then collides re-creating the extension, and the
  container exits with code 3.
- Port 5433 is taken on the dev machine by an unrelated `vtk-pr9-postgres`
  container; this project uses 5434.

---

## 6. Data-integrity notes worth acting on

- `./directus-uploads/` is complete: all 2,236 manifest files present, 1.6 GB.
  (The 376 extra `*__<hash>.avif` files are Directus thumbnail cache and are
  regenerable — they are not in the manifest and can be ignored.)
- `orders.company` and `orders.zone` were NULL in all 374 rows and were dropped;
  company/zone resolve through `booth`.
- `vacancies_vacancy_sectors` is the canonical vacancies↔sectors junction
  (confirmed via Directus relation metadata and the merged branch's code);
  `vacancies_vacancies_sectors` and `vacancies_sectors` were abandoned drafts.
- `CareerEventPage` ↔ `Timetable` has **two** junction tables that are *not*
  duplicates: `career_event_page_timetable` backs `page.timetable` (48 rows),
  `timetable_career_event_page` backs `timetable.events` (33 rows).
- The Directus instance held 3 active Flows (`creating_company_user`,
  `deleting_company_user`, `WANNES TEST`). **These have not been reimplemented.**
  Their definitions are in `directus-export-*/schema/flows.json` and
  `operations.json`. Check them before decommissioning Directus.

---

## 7. Suggested order of work

1. **Decide the auth model**, then convert `users.ts` + `students.ts` +
   `auth-server.ts` + `auth-student.ts` + `invite-token.ts` together — they are
   one unit and half-converting them breaks login.
2. **Decide file storage**, then convert `repos/directus.ts` and the file API
   routes, and replace the 6 hardcoded asset URLs.
3. Sweep the remaining `src/app` files.
4. Reimplement the two live Directus Flows.
5. Remove `@directus/sdk`, delete the Directus client modules, clean `.env`.
6. Decommission Directus. Rotate the DB password and the Directus `SECRET`
   at this point — both were pasted in plaintext during this work.
