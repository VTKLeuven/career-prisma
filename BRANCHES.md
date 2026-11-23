# Branches for `instructions.txt`

One branch per item, each cut from `main` at `c18e1e0`. This file and
`instructions.txt` are deliberately left out of every commit.

## `feature/invite-link-14-days` — Invitation Company Representative

**Asked:** a new company representative should have 14 days to activate their
account before the link in the invitation mail expires.

**What it was:** `INVITE_MAX_AGE_MS` in `src/lib/invite-token.ts` was 7 days,
and the invitation mail said "7 days" in its own hard-coded copy of the number.

**What changed:**
- New `src/lib/invite-validity.ts` holds `INVITE_VALID_DAYS = 14` (and the
  derived milliseconds). The token check (`invite-token.ts`) and the mail
  template (`email-templates.ts`) both read it, so the mail can't promise a
  different period than the check enforces.
- The age is measured from `users.invite_token_created`, so **invites that were
  already sent also get the 14 days** — no data migration needed. "Resend
  invite" in the admin still starts a new period.
- When a link has expired, `/accept-invite` now says that links work for 14
  days and to ask the VTK contact for a new one (shared
  `INVITE_INVALID_MESSAGE`, used by the validate / accept / setup-company
  routes).
- Docs: `docs/auth.md` explains this; `MIGRATION.md` said "seven days" and now
  says 14.

**Tested** (production build, against a throwaway copy of the dev database, see
"How I tested" below):
- `/api/invite/validate` with invites aged 1, 10 and 13.9 days → valid;
  14.1 and 15 days → rejected with the new message. (A 10-day-old invite was
  rejected before this change.)
- Accepting a 10-day-old invite sets the password and makes the account
  `active`; using the same link again is rejected (still single-use).
- Rendered the invitation mail template: it says "expire in 14 days".
- ESLint clean on the changed files; `next build` passes.

## `fix/student-auto-relogin` — auto re-login werkt niet

**Asked:** when the (24 h) student session expires the student is not sent back
through vtk.be automatically; they have to press "Student login" every day.
Every page open should process the stored token and, if there is one, bounce
through vtk.be for a new one. The token should count as active for 1 day but
stay in the browser for about 30 days (unless replaced).

**What it was:** the silent bounce only lived on `/student-login`, so it only
happened when the student clicked the button. The session cookie also expired
together with the token (24 h), so no other page could know the visitor had
been signed in.

**What changed:**
- **Token 1 day, cookie 30 days.** The SSO callback still mints a token valid
  for `STUDENT_SESSION_MAX_AGE` (24 h) but sets the cookie with
  `STUDENT_SESSION_COOKIE_MAX_AGE` (30 days). After the first day the cookie
  signs nobody in (every check still rejects it). A new login replaces it, and
  logout / account deletion remove it.
- `auth-session.ts`: the signature check is split out, plus
  `isRecentlyExpiredSessionToken()`.
  `auth-student.ts` → `studentSessionNeedsRefresh()`: a genuine, expired
  student token from the last 30 days **and** the `student_sso` hint (so
  password students are never bounced). Cookies only, no DB query.
- **Every public page checks it.** The `(site)` layout passes the flag to the
  new `StudentAutoRelogin` component, which redirects to
  `/api/auth/oauth/initiate?auto=1&redirect_to=<current page + query>`.
  `/api/user/check` carries the same flag, so a **client-side navigation**
  after the session expired in an open tab also triggers it. **Window focus
  deliberately does not**, so a student coming back to a half-filled form is
  never navigated away.
- **Invisible to the student:** `auto=1` re-checks the condition on the
  server, asks for the scopes they granted last time, and adds
  **`prompt=none`**. vtk.be supports it (see `career-sso-answers.md`):
  - with a live vtk.be session it comes straight back with a code, and the
    student lands on the page they opened, signed in;
  - without one it answers `login_required` (or `consent_required` /
    `interaction_required`) **without showing a screen**. The callback then
    returns them to the page, signed out (not the error page), and logs an
    `info` `login_failed` with `auto: true`.
  - If vtk.be can't be reached at all, `auto=1` also just goes back to the page.
- **No loops:** the initiate route deletes the expired cookie when it starts
  an automatic flow, so each expired session gets exactly one attempt.
- `/student-login` is unchanged: clicking "Student login" is still an
  interactive login, so a student without a vtk.be session gets vtk.be's
  login page there, as before.
- `/admin/system-status` shows the 30-day window. `docs/auth.md` has a new
  "Automatic re-login on any page" subsection.

**Rollout note:** students who are signed in at deploy time still have the old
24 h cookie, so they get the new behaviour from their next login on.

**Tested** (production build + throwaway Postgres + a mock vtk.be OIDC
provider in the scratchpad that answers with a code or `login_required`):
- 33 HTTP-level checks, all passing:
  - normal login: cookie Max-Age 30 days, token `exp` ≈ 24 h, no `prompt=none`;
  - detection: expired SSO session → flag set (in the page and in
    `/api/user/check`); not set for no hint, expired > 30 days ago, a forged
    signature, a token of the wrong kind, a valid session, or an anonymous
    visitor;
  - auto flow with a vtk.be session: `prompt=none`, expired cookie dropped,
    lands on the original URL (query kept), signed in;
  - without a vtk.be session: back on the page, never a login screen, signed
    out, no second attempt, logged as `info`;
  - `/student-login` still interactive; `auto=1` for anonymous or signed-in
    visitors is a plain redirect back; external `redirect_to` refused; after
    logout nothing re-signs; vtk.be unreachable → back to the page (the manual
    flow still shows its 500 as before).
- Headless Chromium: page load re-signs and lands on the same URL with the
  header showing the student; no vtk.be session → exactly one attempt and no
  retry on reload; session expiring in an open tab → focus does nothing, the
  next header-link navigation re-signs.
- ESLint clean on the changed files (the one error it reports in
  `system-status/page.tsx:80` is already on `main`); `next build` passes.

## `feature/event-page-company-search` — Search bar for adding company to event

**Asked:** when editing an event under *Event pages*, adding companies means
scrolling through every company. Add a search to find and click a company,
and a small overview of which companies are already added.

**What it was:** the Companies field is a generic `multiselect` field of
`ResourceManager` (`src/components/admin/ResourceManager.tsx`), rendered as one
scrollable checkbox list of all companies (120 in the dev data).

**What changed** (in the shared `MultiSelect`, so it's one component, not a
copy for one page):
- From **9 options** up, the field shows:
  - **"Added (n)"**: the picked companies as chips, sorted by name, each with
    an × to remove it. "Nothing added yet." when empty. A picked id whose
    company no longer exists shows as "Unknown (…)" so it can still be
    removed.
  - **A search box** ("Search companies...") that filters the list, ignoring
    case and accents ("societe" finds "Société …"), plus "x of y shown" while
    filtering and a "No matches" message.
  - **Enter** adds the first match that isn't added yet and clears the box.
    Before, Enter in the editor would have submitted the whole form.
- Shorter lists (the 7 header buttons, timetable types) keep the plain list.
- Event pages label the boxes "Search companies..." and "Search speakers...".
  Other long multiselects get the same UI for free: a faculty's masters, and
  a career option's events and sub-options.
- `docs/conventions.md` mentions it under the `ResourceManager` notes.

**Tested** (headless Chromium as an admin, production build, throwaway DB):
- Opening "VTK Jobfair" shows "Added (3)" with a chip for each of its 3
  companies.
- Typing "company 05" shows exactly the 10 matching companies and
  "10 of 120 shown"; "TECHNO" finds TechnoBel; nonsense shows "No matches".
- Enter adds "Test Company 050", clears the box, and doesn't close or submit
  the editor. Ticking a checkbox adds a chip; a chip's × removes it and
  unticks the box.
- Save writes exactly the expected set to `career_event_page_companies`.
- No page errors. At phone width (390 px) the editor doesn't scroll sideways.
  Screenshots checked at desktop and phone width.
- ESLint: `ResourceManager.tsx` clean (the 4 `react-hooks/purity` errors in
  `event-pages/client.tsx` are on lines this branch doesn't touch and exist
  on `main`); `next build` passes.

## `feature/form-public-name` — Splitsing naam form en backend form

**Asked:** a form's name is long and descriptive because admins need to find
it in the back office, but that same name is what companies see on their
dashboard. Split the back-office name from the name shown to companies.

**What changed:**
- **Database:** new nullable column `forms.public_name`, migration
  `20261113060000_form_public_name` (one `ALTER TABLE … ADD COLUMN`). It's
  applied by the normal deploy (`prisma migrate deploy`). NULL means "show
  the normal name", so **every existing form looks exactly as before** until
  an admin fills in a public name.
- `formDisplayName(form)` in `src/lib/form-fields.ts`: public name if set,
  else the name. Used everywhere companies or students see a form:
  - company dashboard (resolved in `dashboard/page.tsx` on the server, so
    the internal name never reaches the company's browser);
  - the company form page `/forms/company/…` and the student form page
    `/forms/<slug>` (title and browser tab). The public form action now
    returns only the display name, so the internal name isn't in the page
    source either;
  - the company scans list;
  - mails: student registration confirmation, company form confirmation,
    QR-ticket mail, and `{form_name}` in reminder mails. The admin's default
    reminder text now uses the `{form_name}` placeholder instead of baking
    the internal name in.
- **Admin (`/admin/forms`):** the dialogs say "Form name (internal)" (with
  "Only admins see this name") and have an optional **Public name** field.
  The list shows "Public: …" under the name, and the list search finds forms
  by public name. Blank or whitespace is stored as NULL; values are trimmed.
- While creating a form, the **slug** and the **confirmation mail subject**
  (and the company mail's default text) now follow the public name when there
  is one, because those are what students and companies see. They also keep
  following the name as you type, as long as you haven't edited them yourself.
  Before, typing a name froze the subject after the first letter
  ("J - Registration Confirmation").
- Admin-only screens (builder, responses, floorplan, completion overview,
  CV books) keep showing the internal name.
- `docs/data-model.md` explains the two names.

**Tested** (production build, throwaway DB with the migration applied via
`prisma migrate deploy`; `prisma migrate diff` against that DB matched the
migration exactly before applying):
- Admin, headless Chromium: creating a form with both names stores both,
  trimmed. The slug follows the internal name, then the public name once
  given, and a hand-typed slug is left alone. The mail subject default is
  "Jobfair registration - Registration Confirmation". The list shows
  "Public: …" and search by public name works. Clearing the public name
  stores NULL.
- Student view of `/forms/<slug>`: title and `<title>` show the public name,
  and the internal name appears nowhere in the HTML or RSC payload. After
  clearing, it falls back to the internal name.
- Company rep: the dashboard lists the company form by its public name, the
  internal name isn't in the page, and the company form page title is the
  public name.
- Submitting the registration as a student with mail pointed at a local SMTP
  sink: subject and heading use the public name, and the internal name
  appears nowhere in the mail.
- ESLint: no new problems in any changed file (one fewer than `main`);
  `next build` passes.

## `feature/form-duplicate` — Forms Duplicate optie

**Asked:** be able to duplicate / copy an old form, so each year only a few
small things need adjusting instead of building a new form from scratch.

**What changed:**
- **"Duplicate"** in a form's ⋯ menu on `/admin/forms` opens a small dialog:
  - **Name of the copy**: suggested as next year's name. Every year in it
    moves up by one ("Jobfair 2026" → "Jobfair 2027", "CV book 2025-2026" →
    "2026-2027"); a name without a year gets " (copy)". It's only a
    suggestion and can be edited.
  - **Slug**: follows the name until you edit it. A slug that's already in
    use, or one with invalid characters, is refused with a clear message.
  - **Link to event** (only for registration and company forms): pick the
    new edition's event straight away, or leave it for later.
- What the copy gets (`duplicateForm()` in `src/lib/repos/forms.ts`, behind
  `duplicateFormAction()`, admin only):
  - the form's columns (description, and any column added later, so with
    `feature/form-public-name` merged the public name is copied too);
  - the **active version's fields and settings** (or the newest version if
    none is active), as version 1 of the copy: confirmation mails, max
    entries, login requirement, location, scanning columns, "compulsory",
    etc.;
  - **no responses**.
- What it deliberately does **not** copy, because it belongs to one edition:
  the linked event (`event_id`), the packages it's assigned to
  (`option_ids`, which are per-year rows), `deadline`, `event_date`,
  `event_end_date`, and the `imported_cv_book` flag (which would make the
  copy a closed form). Keeping last year's event would have made the copy
  look like last year's registration form, and saving it would even have
  repointed last year's event page at it.
- The copy **starts disabled** (like a new form), and its edit dialog opens
  right after duplicating so you can set the remaining dates and packages.
  The event page's registration link is only pointed at the copy once you
  enable it, so students never land on a disabled form.
- Small fix on the way: the forms list compared row ids with `===`, but ids
  arrive as numbers despite being typed as strings. That's why the copy's
  details didn't open at first; ids are now compared as text.
- `docs/data-model.md` documents what is and isn't copied.

**Tested** (headless Chromium as admin, production build, throwaway DB). The
source was "Jobfair registration 2026 (test)": 4 versions (v4 active), 2
responses, and a deadline, event date, location, mail subject and max
entries in its metadata.
- Suggested name "Jobfair registration 2027 (test)", slug follows it; a
  taken slug and a malformed slug are both refused with a message.
- With Career Day picked: the copy exists, is disabled, has exactly one
  active version 1 with the **same schema** as the source's active version,
  `event_id` = Career Day, deadline and event dates gone, and settings and
  mails kept. 0 responses copied; the **source is unchanged** (metadata,
  version count, responses).
- The copy's edit dialog opens right after. Career Day's registration link
  is unchanged until the copy is enabled, then points at
  `/forms/jobfair-registration-2027-test`.
- The builder shows all copied fields, and the enabled copy opens for a
  student.
- Company form: the "is company form" flag is kept, event and packages are
  cleared, and the dialog hints to assign this year's packages.
- A form without a year in its name gets "(copy)"; a plain form shows no
  event picker. No page errors.
- ESLint: same counts as `main` in every changed file; `next build` passes.

## `feature/student-registrations` — Registratie bevestiging evenementen

**Asked:** an overview where students can see which events they're registered
for. Right now they can't tell whether they're registered.

**What it was:** a registration was only visible if the student reopened that
exact form ("You have already submitted a response").

**What changed:**
- New page **`/student/registrations`** ("My registrations"), linked from the
  student menu in the site header (desktop and mobile). Signed-out visitors
  are sent to the student login and come back afterwards.
- `listStudentEventRegistrations()` in `src/lib/repos/forms.ts` returns the
  student's **newest non-archived response to every event-registration form**
  (metadata `is_event_registration`, in any of the spellings it has been
  stored with). Students are matched on `_student_id` stored as a number or
  as a string, like the rest of the forms repo. Archived and older duplicate
  responses don't show, and other forms (CV book, …) never do.
- Each registration shows:
  - the event's name (with the form's name under it), date and hours,
    location. For a form not linked to a career event (a workshop, say), the
    form's own date/time and location, with same-day ranges written as
    "1 October 2026, 18:00 - 20:00";
  - when they registered;
  - **View event** (when the event is published) and **View or change
    registration** (while the form is enabled and its deadline, if it has
    one, hasn't passed: after the deadline the form page refuses changes);
  - **Show check-in QR code**: the same QR the confirmation mail contains
    (attendant id, same image service), folded away by default. It's a
    `<details>` element, so it needs no client JavaScript.
- **Upcoming** registrations come first, soonest first (undated ones after
  them), then **Past**. Past ones are dimmed, without ticket or change link.
- The form's thank-you page has a **My registrations** button after an event
  registration, so students learn where to find it.
- Uses the form's public name when one exists (see merge notes).
  `EVENT_TIME_ZONE` is now exported from `src/lib/utils/events.ts` so dates
  are shown in Belgian time like the rest of the event code.
- `docs/data-model.md` has a "Student registrations" section.

**Tested** (headless Chromium, production build, throwaway DB with
registrations set up for the cases below):
- Student 1 sees exactly 3 registrations: VTK Jobfair (`_student_id` as a
  number, with an older duplicate that is correctly hidden), Career Day
  (`_student_id` as a string), and a form without a career event dated in the
  past. Not shown: the archived response, the CV-book responses.
- Order: Jobfair then Career Day under Upcoming; the dated form under Past.
- Jobfair card: "Thursday, 11 March 2027, 09:45 - 17:00", "Brabanthal,
  Leuven", the form name, "Registered on …". Links go to `/event/vtk-jobfair`
  and `/forms/jobfair-registration-test`. Career Day's form is closed, so it
  has no change link.
- QR hidden until clicked; then shown, encoding the attendant id without
  dashes. The past item shows "1 October 2026, 18:00 - 20:00" and its
  location, with no ticket or change link.
- The student menu item opens the page. No sideways scroll at phone width.
  Screenshots checked.
- A student with no registrations gets the empty state (and not someone
  else's registrations). Signed out → `/student-login?redirectTo=…`.
- Submitting an event registration: the thank-you page offers
  "My registrations", and the new registration is listed there.
- ESLint: the new page is clean, and the other changed files are unchanged
  from `main`; `next build` passes.
- Added later, after trying it on the `test` dev server: a registration
  whose form deadline has passed (but which is still enabled) no longer
  shows "View or change registration". Checked with a Career Day form whose
  deadline was 10 Nov 2026: no link, while the open Jobfair form keeps it.

---

## Merge order

**The six branches can be merged in any order.** Each is cut from `main`,
builds on its own, and I checked every pair with `git merge-tree`: no
conflicts. I also merged all six into a throwaway local branch (deleted
again, never pushed): it builds, and the combined behaviour was tested (see
below).

Worth knowing when merging:
- **`feature/form-public-name` is the only one with a database migration**
  (`20261113060000_form_public_name`, adds one nullable column). The normal
  deploy runs `prisma migrate deploy`, so nothing manual is needed. Locally,
  run `npx prisma migrate deploy` (or `migrate dev`) and `npx prisma generate`
  after merging it.
- `feature/form-public-name` + `feature/form-duplicate`: work together with
  no extra change. The duplicate copies the form's columns generically, so
  the public name is copied too (tested on the combined build).
- `feature/form-public-name` + `feature/student-registrations`: work together
  with no extra change. The registrations page uses the public name as soon
  as the column exists, and before that it shows the normal name (tested
  both ways).
- `fix/student-auto-relogin` and `feature/student-registrations` both add to
  `SiteHeader.tsx`, in different places, and merge cleanly.
- `feature/form-public-name`, `feature/form-duplicate` and
  `feature/student-registrations` all touch `src/lib/repos/forms.ts`,
  `src/app/actions/forms.ts` and/or `admin/forms/page.tsx`, also in different
  places, and merge cleanly. If you merge one and rebase another, git handles
  it automatically.

Combined-build checks (all six merged): the registrations page shows the
public name ("Jobfair registration") and never the internal one; duplicating
a form with a public name copies it, and the copy's edit dialog shows it; the
33 auto-re-login HTTP checks, the auto-re-login browser checks and the
company-search browser checks all pass again; invites at 13.9 / 14.1 days
are accepted / rejected.

---

## How I tested (all branches)

- **Never against the shared dev database or Docker.** Writing test data to
  `career-db` was blocked, so I ran a private, throwaway **Postgres 16 as my
  own user** (binaries unpacked from the Ubuntu packages into the session
  scratchpad, port 5498). I loaded a read-only `pg_dump` of the dev data into
  it, and the test server's `DATABASE_URL` pointed only there. It's stopped,
  and the dumps are deleted.
- **Production builds** (`next build` + `next start` on `127.0.0.1:3100`,
  each in a capped `systemd-run` scope, one heavy job at a time), not the dev
  server. Memory stayed well inside the budget (anon ≤ ~0.6 GB before each
  build).
- **Headless Chromium** (Playwright, outside the repo) for every UI change,
  with screenshots I looked at, at desktop and phone width.
- **A mock vtk.be OIDC provider** for the auto-re-login flows (answers with a
  code, or `login_required` for `prompt=none`), and **a local SMTP sink** so
  confirmation mails could be inspected without sending anything.
- After each change: ESLint on the changed files (compared against `main`)
  and `next build`.
- Cleanup: every process I started is stopped (test server, Postgres, mock
  OIDC, SMTP sink, browsers). The Prisma client in `node_modules` was
  regenerated from `main`'s schema. I ran a normal `next build` of `main` at
  the end, so `.next` no longer contains my test build (which had
  `127.0.0.1:3100` baked in as the site URL).

Pre-existing issues I noticed but left alone (not part of these items):
- `npm run lint` reports errors that already exist on `main`, e.g.
  `react-hooks/purity` in `admin/system-status/page.tsx` and
  `admin/event-pages/client.tsx`.
- New forms are created **disabled** (`forms.is_active` defaults to false),
  so an admin has to enable one before students can open it. This branch set
  keeps that behaviour (a duplicated form also starts disabled).
- `/vacancies` drops query parameters from its URL.
- Nothing was pushed, no PRs were opened, and no commit has a co-author
  trailer.

---

## The `test` branch (for trying everything at once; don't merge it)

`test` = `main` + the six commits above, cherry-picked in this order: invite,
auto-relogin, company search, public name, duplicate, registrations. Merge
the feature branches, not `test`.

**Running:** tmux session `career-dev`.
- Window `app`: `npm run dev` on `http://apollo:3000` (capped scope, 3 GB).
- Window `mock-vtk`: a stand-in for vtk.be on `http://apollo:3199`.

The dev server gets the `VTK_SSO_*` variables on its command line, pointing
at the mock; `.env` is not changed. Stop both with
`tmux kill-session -t career-dev`.

**Changes to the local dev database (`career-db`):**
- Migration `20261113060000_form_public_name` applied (one nullable column,
  `forms.public_name`).
- Test data, all removable with the seed script's `--clean` (scratchpad
  `devseed/seed.mjs`). It matches its rows by slug / user id:

| Slug / user | What it tests |
|---|---|
| `test-jobfair-2027-registration` | Internal name "Jobfair 2027 student registration - internal tracking v3", public name "Jobfair registration". student@dev.local is registered (QR, change link). Good one to **Duplicate** (suggests 2028). |
| `test-career-day-2027` | student@dev.local registered, deadline passed → listed without a change link |
| `test-info-session-delta` | A past event (1 Oct 2026, form's own date/place) → under "Past" |
| `test-speed-dating-2027` | Open, nobody registered: register yourself, then "My registrations" |
| `test-career-day-2027-company-intake` | Company form for Standard-booth companies; rep@dev.local (TechnoBel) sees it as "Career Day intake" |
| `invite-10-days@dev.local` | An invite sent 10 days ago: still valid (it wasn't before) |
| `invite-15-days@dev.local` | An invite sent 15 days ago: refused with the "ask VTK for a new one" message |

**The mock vtk.be** (`http://apollo:3199`) has buttons to:
- log in to and out of "vtk.be";
- **make your career-site session expire now**, instead of waiting 24 hours. It can do this because cookies ignore the port, so it overwrites `student_session` on `apollo`.

It also lists both invite links and the student test pages.

Smoke-tested on the dev server with headless Chromium:
- every item above;
- an SSO login, then an expired session coming back signed in silently;
- with no vtk.be session, coming back quietly signed out.

All passed.
