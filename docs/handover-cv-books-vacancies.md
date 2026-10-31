# Handover: CV books, purchase grants and the vacancy platform

Work in progress as of 2026-10-30. Written for the next agent picking this up.
Read `CLAUDE.md`, `AGENTS.md` and `docs/` first as usual -- this file only adds
what is not there yet: where the work stands, what the user decided, and what
is next. The durable rules are already in [`data-model.md`](data-model.md)
("What a purchase grants" and the CV book bullets under "Company-facing
products").

## 1. Where things stand

| Piece | State |
|---|---|
| CV book privacy, student opt-out, one book per year, Master Degrees study field | Committed locally: `59a07a5` |
| One "Publish" switch instead of active + "Mark ready" | Committed locally: `cf59aa7` |
| Seed data for CV books | In `cf59aa7` (+ grant rows, uncommitted) |
| **Phase 1: purchase grants** (`career_sub_option_grants`) incl. vacancy lock | **Uncommitted** in the working tree |
| Phase 2: importing old CV books | **Built, uncommitted** (2026-10-30) -- see §5 |
| Phase 3: selling older CV books | Mostly falls out of Phases 1 + 2 |
| Follow-up migration dropping `cv_books.screening_complete` | Not done; must ship in a *later* deploy |

`main` is **ahead of `origin/main` by 3 commits and not pushed**. Pushing `main`
deploys to dev (`dev.career.vtk.be`) and runs the migrations there; production
is a manual workflow. Do not push, commit or deploy unless the user asks.
The user commits themselves; never add a Co-Authored-By / Claude trailer.

Migrations, all applied to the **local** database only:

1. `20261029133606_cv_book_privacy` -- `files.private`, `students.cv_book_opt_out`, and marks every CV already in a book private.
2. `20261029145323_cv_book_single_publish` -- data only: a book stays published (`active`) only if it was active *and* screening-complete.
3. `20261029160306_sub_option_grants` -- the grants table, backfilled from today's sub-option names.

## 2. The CV book, as it works now

A `CvBook` is not a document. It points at a form plus the field names holding
name, email, study, CV and LinkedIn; its contents are that form's responses,
read live by `getCVBookStudentData()` in `src/lib/repos/cv-book.ts`.

- **Years.** One form (`/forms/cv-book`) feeds every year's book. A response belongs to the book whose academic year had most recently started when it was submitted (`responsesForBook()`). A signed-in student's resubmit used to overwrite their one response forever; now, for forms behind a CV book, a resubmit after the current academic year's start creates a new response (`cvBookResponseWindowStart()`, used by the submit action and the form prefill in `src/app/actions/forms.ts`).
- **Screening.** Companies only ever see CVs an admin approved **one by one** (`screeningStatus === "approved"`). The user explicitly rejected any "approve all" button: it defeats the manual check.
- **Publishing.** `cv_books.active` is the single switch ("Publish" / "Unpublish" on `/admin/cv-book/screening`, "Status: Published / Hidden" on `/admin/cv-book`). `screening_complete` is no longer read; the column stays until a later deploy drops it (`docs/operations.md`: destructive migrations ship as two deploys).
- **Privacy.** CVs are `files.private`. `/api/files/[id]` (and `/info`) serve a private file only to an admin, a company that can see that CV in a book it may open, or the student whose response holds it (`src/lib/file-access.ts`), with `Cache-Control: private, no-store`; anyone else gets 404. `markCVFilesPrivate()` runs after each submission and when a book is created or remapped. Public uploads are still public by UUID with a one-year cache.
- **Opt-out.** `/student/account` -> "CV book" card -> "Show me in CV books". Hides the student from companies in every book (matched by student id, or by email for CVs sent without signing in). Screening shows "Withdrawn by student". The CV stays on file.
- **Master Degrees** as the study field stores ids; the book shows master/faculty names and screening offers the masters (`studyLabeler()`, `masterDegreeStudyOptions()`).

## 3. Phase 1: purchase grants (uncommitted)

The user disliked "it has to be exactly this name for access to work". Access
used to depend on sub-option **names**: "CV Book", "Company Page On Platform",
"Student Schedules", "Extra Booth", and anything containing "matching" and
"software". Renaming one silently switched the feature off.

**Design the user approved:** a generic table, *not* CV-book specific.

- `career_sub_option_grants`: `career_sub_option_id`, `type` (varchar key), `config` (jsonb), unique per (sub-option, type), cascade-deleted with the sub-option. The user suggested "a string field which holds JSON"; we used `jsonb` (validated, queryable, same as the rest of the app) -- they agreed.
- **Meaning lives in code**: `src/lib/grants.ts` (`GRANT_TYPES`) -- label, description, duration (`sale_year` or `forever`), config parser. A new kind of access = a new entry there plus its check, **no migration**. Unknown types in the DB are ignored.
- Types: `cv_book` (`{"scope":"sale_year"}` or `{"scope":"books","bookIds":[..]}`, forever), `company_page`, `vacancies`, `matching_software`, `student_schedules`, `extra_booth` (all for the year sold).
- **Only sub-options carry grants**; a package grants what its sub-options grant. Packages are copied per academic year (`copyAnnualCatalog`), sub-options are not -- so no catalog-copy changes were needed.
- **Checks.** `shapeCompany()` (`src/lib/repos/_shape.ts`) puts this year's grant types on `company.grants`; `hasGrant()` / `hasCompanyPageAccess()` / `hasMatchingSoftwareAccess()` in `src/lib/utils/company-access.ts` read it (sync, also used in client components). All name-matching helpers were deleted. CV books (forever) are worked out across all years in `listCVBookAccessForCompany()`; `getCVBookSubOption()` (price on the request-access page) finds the `sale_year` cv_book grant.
- **Company page** still also requires the company's status `published` (user agreed to keep that as an admin kill switch). There is no page to "create": `/company/<slug>` renders from Settings -> Information when both hold.
- **Vacancies** had **no purchase check at all** before (only `DEV_ENVIRONMENT`). The user chose to lock it behind the `vacancies` grant; it is dev-only so production is unaffected. `src/app/actions/vacancies.ts`: `requireVacancyCompanyUser()`, `assertCanManageVacancy()`, `fetchVacancyAccessAction()`; the dashboard page shows "not part of your company's package" without it. Admins are exempt.
- **Admin UI**: `/admin/career-options` -> Sub-options: "Grants access to" column and a "Purchasing this grants access to" editor (`src/components/admin/SubOptionGrantsEditor.tsx`, plugged in via ResourceManager's `renderInput`). It renders from `GRANT_TYPES`, so new types appear automatically; types with settings need their own small editor there.
- The backfill matched names case-insensitively/trimmed like the old checks. Locally only "CV Book" and "Company Page On Platform" exist; **matching software / student schedules / extra booth backfill is untested against real data** -- after a deploy, check the Sub-options tab.

Verified: `tsc` and lint clean (no new lint problems vs. HEAD), `next build`
passes, 15 repo-level checks against the seed data (grants per company, rename
keeps access, archive "specific books" grant, save/replace/cascade, input
validation), and the key pages over HTTP per role. Not clicked through in a browser by an agent, but **the user clicked through every
edited screen on 2026-10-30** and confirmed that removing TechnoBel's options
changes what it can access. Still open: the backfill against real sub-option names
(below).

## 4. Decisions the user made (do not re-litigate)

- Companies keep access to a CV book **for good** once bought; they may later be able to buy **older** books at a different price (Phase 3).
- Student opt-out covers **all** CV books, reversible, CV kept (not deleted).
- **No bulk approval** anywhere; one publish switch.
- Grants table generic (type + JSON config); grants on sub-options only.
- Lock vacancies behind a grant.
- Keep `published` status as an extra requirement for company pages.
- Imported old CVs (Phase 2) are approved on import, not screened again.
- Finish Phase 1 before starting Phase 2.

## 5. Phase 2 (old CV books)

**Built 2026-10-30, uncommitted, not clicked through in a browser yet.**
`/admin/cv-book` -> "Import old CV book": pick the year (no book yet; create
older years on `/admin/academic-years`), upload the Litus PDF, "Read PDF"
shows every CV with name / email / programme and what needs a look (no
email, one-word name, index mismatch, skipped pages), names and emails are
editable, unticked CVs stay out, clicking a row shows its page beside the
table (the browser's own PDF viewer on a blob URL of the upload, `#page=N`;
nothing extra is sent to the server), "Import" creates the book hidden with
every CV approved.

- `src/lib/litus-cv-book.ts` -- parse (pdfjs, page types by font size and
  position, multi-page CVs, index cross-check) and split (pdf-lib; drops
  the images a page does not draw -- FOP shares one resource dictionary, so a
  naive split made every CV 7 MB).
- `src/lib/cv-book-import.ts` -- applies corrections, writes files to disk,
  calls `createImportedCVBook()` (`src/lib/repos/cv-book.ts`, one
  transaction); removes the files again on failure.
- `src/app/api/admin/cv-book-import/route.ts` -- admin-only, `mode=preview`
  or `mode=import`. A route, not `/api/upload` (which would store the whole
  book as a public file) nor a server action (10 MB body limit).
- Submit action refuses forms whose version metadata has `imported_cv_book`.
- Book no longer skips CVs without email; both views hide the empty mail link.

Tested over HTTP on the dev server with `cvbook-2425.pdf`: 310 CVs in 88
programmes, all matching the index, 3 without email, 1 two-page CV; preview
~5 s, import ~5 s, 11 MB of files. Validation (empty name, year with a book),
cleanup after a failed import, private file access (anonymous / rep 404,
admin 200 no-store), 401 for non-admins and the submit guard all checked.
The test import and test year were removed again.

Original plan and questions, for reference:


Plan agreed in outline: each imported book gets its **own, inactive form**
(students cannot submit to it); imported CVs become that form's responses, so
screening, favourites, opt-out (by email), private files and grants all work
unchanged. Import page on `/admin/cv-book`: pick the academic year (create older
years on `/admin/academic-years` first), upload a spreadsheet (first, last,
email, study, LinkedIn, CV filename) and the PDFs (one at a time via
`/api/upload`, 50 MB limit each), preview mismatches, import as a hidden book.
Selling it = a sub-option with a `cv_book` grant `{"scope":"books","bookIds":[id]}`
sold in the **current** year (past years stay read-only for sales).

Ask before building:

1. ~~What do the old CV books look like?~~ **Answered (2026-10-30): one big PDF per year**, a direct Litus export (sample: `cvbook-2425.pdf` in the repo root, git-ignored -- it holds real students' data, never commit or publish it). Findings from the sample (471 pages, Apache FOP 2.4, real text, no links/annotations):
   - Pages 1-10: foreword, programme descriptions, table of contents. Last pages: alphabetical index (name -> page).
   - A **divider page per programme**: the KU Leuven programme name in 30 pt (e.g. "Master of Electrical Engineering (Leuven) - Electronics and Chip Design"); 111 dividers, 88 distinct names.
   - **Every CV is exactly one page** (310), starting with the name in bold 13 pt at the top, then email (missing on 4), phone, birth date, address, optional photo (~half), then fixed sections (About Myself, Studies, Languages, Experiences, Thesis, Career, ...). No LinkedIn.
   - Blank filler pages (footer only) so sections start on a right-hand page.
   - Footer on every page: "CV-Book", page number, programme name.
   - So it splits deterministically: `pdfjs-dist` (already a dependency; the legacy build runs in Node) to classify pages, `pdf-lib` (also a dependency) to cut one PDF per CV, cross-checked against the alphabetical index.
2. ~~Imported CVs approved straight away, or screened again?~~ **Decided (2026-10-30): approved on import** -- they were already in a published book.
3. Privacy: students consented to "the CV book of year X"; reselling old CVs years later may exceed that. The user should check with VTK's privacy contact before Phase 3 goes live.

Also pending: the follow-up migration that drops `cv_books.screening_complete`
(only after the version that stopped reading it is deployed).

## 6. Working on this machine (apollo) -- important

The user's account runs in a systemd slice capped at **MemoryHigh=5G /
MemoryMax=6G** (`/etc/systemd/system/user-1000.slice.d/memory.conf`), shared
with their VS Code server. A dev server (2-3+ GB) plus VS Code pushes it over
and the kernel throttles everything -- the user's editor included. Diagnosed
2026-10-30 with `sar -f /var/log/sysstat/sa29` and
`/sys/fs/cgroup/user.slice/user-1000.slice/memory.events`.

- **Stop the server before editing** and before `tsc` / lint / build. Tell the user when you do.
- **For the user to test, serve a production build**, in tmux session `career-dev`, each in its own capped scope:
  ```bash
  systemd-run --user --scope --quiet -p MemoryHigh=3G -p MemoryMax=3584M nice -n 10 npx next build
  tmux new-session -d -s career-dev -c "$PWD" \
    "systemd-run --user --scope --quiet -p MemoryHigh=1G -p MemoryMax=1536M nice -n 10 npx next start -H 0.0.0.0 -p 3000"
  ```
  (~1 min build, ~400 MB running; the "next start does not work with output: standalone" warning is harmless here.) Rebuild after code changes. The user reaches it at `http://apollo:3000`.
- A dev server only while iterating, also capped: `systemd-run --user --scope --quiet -p MemoryHigh=2500M -p MemoryMax=3G nice -n 10 env NODE_OPTIONS=--max-old-space-size=2048 npm run dev -- -H 0.0.0.0 -p 3000`.
- Before heavy work: `free -m` and `uptime`; skip if available < 2 GB or 1-min load > 6. Never touch Docker, gunicorn or cloudflared. `next-server` processes in Docker scopes are not ours.
- After a migration run `npx prisma generate`; the user's editor may then need "TypeScript: Restart TS Server".

## 7. Testing

**Dev data:** `node scripts/seed-dev-data.mjs` (re-runnable, keyed on fixed ids; also resets dev passwords from `.env`). Logins `admin@dev.local`, `rep@dev.local` (TechnoBel), `student@dev.local`, password `DEV_ADMIN_PASSWORD`. Postgres is the `career-db` container on 127.0.0.1:5437.
- **CV books:**
  - 2025-2026 is published: 10 CVs, including Tibo (rejected) and Lotte (anonymous upload, opted out by email).
  - 2026-2027 is hidden: 7 CVs, 4 unscreened, plus Lien's second-year CV.
  - Dev Student only has a 2025-2026 CV.
- **Sales:** TechnoBel bought CV Book (both years) and Vacancy Platform; Aurora bought CV Book only last year; Delta bought none.
- **Grants:** CV Book -> `cv_book` sale_year, Company Page On Platform -> `company_page`, Vacancy Platform -> `vacancies`.

**Repo-level checks without the dev server:** repos import `server-only`, which only Next resolves. Put an empty stub package somewhere outside the repo, then:
```bash
export DATABASE_URL=...   # from .env
NODE_PATH=/path/to/stubs npx tsx script.ts   # script imports "@/lib/repos/..."
```
Always delete any test rows afterwards.

**Gotchas we hit:**
- `AcademicYear.start_of_year` is typed `string` but Prisma returns a `Date`, so never `localeCompare` it.
- There are no tests; `npm run build` (the pre-push hook) is the gate.
