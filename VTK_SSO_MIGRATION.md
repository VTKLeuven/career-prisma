# VTK SSO migration

The student "Login with your VTK account" flow moved off the old site's LITUS
OAuth and onto the new `vtk.be`, which runs better-auth's SSO provider — an
ordinary OIDC authorization-code provider with discovery, PKCE and a userinfo
endpoint.

This file is the record of that change: what was done, why it is shaped this
way, and what is still open. The durable explanation lives in
[`docs/auth.md`](docs/auth.md); this is the handover note.

## The flow

`/api/auth/oauth/initiate` → `/api/auth/oauth/callback` kept their paths, since
every "Login with your VTK account" link in the app points at them. Only the
provider behind them changed. They now speak proper OIDC: discovery (cached an
hour), PKCE S256, state and nonce. `src/lib/oauth.ts` is gone.

Three files, split so the volatile part is isolated:

| File | Holds |
|---|---|
| `src/lib/vtk-sso.ts` | The protocol — discovery, PKCE, state, nonce, token exchange, userinfo. |
| `src/lib/vtk-sso-claims.ts` | **The only file that knows the provider's claim names.** |
| `src/lib/repos/students.ts` | `upsertStudentFromSso()`, which writes the result. |

No OIDC library, on purpose. That matches design decision 5 — `auth-session.ts`
already mints its own cookies with no JWT library, and pulling in
`openid-client` would drag a second, differently-configured auth stack into a
codebase where no other login uses a library. (NextAuth used to be here for an
unused, hidden KU Leuven login; that was removed on 29 Sep 2026 along with the
`KULEUVEN_*` variables and the `next-auth` package.)

## What the claim registry changed

The provider's exact claim shapes were read off its registry, not guessed.
Three of them would have been got wrong otherwise:

- **Study claims are arrays.** `vtk:study_programmes` and `vtk:study_years`
  carry lowercased enum values (`["computer_science"]`, `["master_1"]`) because
  a member can read two programmes at once. Stored as Postgres `text[]`, not
  scalars.
- **`vtk:study_confirmed_year` is an Int**, not a string.
- **The `vtk:*` claims are userinfo-only.** The ID token carries only `profile`
  and `email` claims, so the callback always calls the userinfo endpoint rather
  than stopping at the ID token. That is required, not an optimisation.

A fourth property is encoded throughout: **claims are absent, never null**. A
claim the SSO omits means "not granted or not known", so it leaves the existing
column alone instead of blanking it.

The ID token's signature is not verified. That is safe here and only here — it
arrives on our own TLS connection to the token endpoint, authenticated with the
client secret, so nothing could have substituted it (OIDC Core 3.1.3.7). `iss`,
`aud`, `exp` and `nonce` are still checked.

## Matching returning students on the r-number

`findExistingStudentRow()` tries, in order:

1. `sso_subject` — they have signed in through the new SSO before.
2. `student_number` — the r-number.
3. `email`, then `username` — for rows old enough to predate the r-number.

Step 2 is the one that matters for the migration: a row created by the old VTK
login has no subject yet, and the r-number is the only identifier that survived
the move and that a student cannot change. It is why `vtk:student_number` is
requested despite its sensitive-consent prompt.

A match on anything but the subject adopts the row and stamps the subject on
it, so every later login takes the first path. Rows that already carry a
*different* subject are never adopted — doing so would hand one student another
student's account.

## 24-hour sessions with silent re-authentication

Student sessions are capped at 24 hours (`STUDENT_SESSION_MAX_AGE`). The SSO's
own session is much longer, so an expired session costs the student a redirect
they never see rather than a login screen.

This project has no middleware, so the bounce lives at `/student-login` — the
single funnel every "you need to sign in" link points at. `page.tsx` became
`client.tsx`, and a new server-component `page.tsx` wraps it:

- Valid session → straight to `redirectTo`.
- No session, but the `student_sso` hint cookie is present → redirect to
  `/api/auth/oauth/initiate`, which comes back already signed in.
- Otherwise → render the login form as before.

The hint cookie is what distinguishes an SSO student from an external one. It
holds no privilege, outlives the session on purpose, and is **cleared on
logout**, so signing out does not sign you straight back in. `?sso=0` forces
the form; the error page at `/auth/callback` links back with it, because
bouncing a failed SSO login straight into the SSO would loop.

### One deliberate exception

Password ("external") students are **not** capped at 24 hours. They have no SSO
to bounce through, so the cap would only mean a daily password prompt. Easy to
change if that is wanted anyway.

## Students who are not at FIRW

`vtk:not_at_faculty` marks a member who does not study at FIRW. They sign in
through the SSO exactly like everyone else and are **never rejected** — the SSO
simply has no programme on file for them and sends an empty array.

The callback routes any student with empty study info to `/student/study-details`,
a new onboarding page that writes their answer and sets `study_self_reported`.
`upsertStudentFromSso()` only overwrites study info when the SSO sends a
**non-empty** array, so the next login cannot wipe what they typed with the
empty claim that sent them there in the first place.

## Refresh policy

There is no background refresh and no `offline_access`. Study programme, year
and r-number are re-read on **every completed login flow** and written straight
onto the `students` row — a login is the only moment this app hears from the
SSO. That is also what pays for the short session above.

Scopes requested: `openid`, `profile`, `email`, `vtk:study_programme`,
`vtk:study_year`, `vtk:student_number`. Not requested: `offline_access`,
`address`, `phone`, `vtk:contact`, `entitlements`.

## Schema changes

Migration `20260910200000_vtk_sso_student_claims`, applied to the local
database and verified against `\d students`.

| Column | Type | Note |
|---|---|---|
| `litus_access_token` → `sso_access_token` | `varchar(255)` | **Renamed**, not dropped |
| `litus_token_expires_at` → `sso_token_expires_at` | `timestamp(6)` | **Renamed**, not dropped |
| `sso_subject` | `varchar(255)` unique | OIDC `sub`; null for password accounts |
| `study_programmes` | `text[] NOT NULL DEFAULT '{}'` | Lowercased SSO enum values |
| `study_years` | `text[] NOT NULL DEFAULT '{}'` | Lowercased SSO enum values |
| `study_confirmed_year` | `integer` | |
| `not_at_faculty` | `boolean` | |
| `student_number` | `varchar(255)`, indexed | r-number; indexed because every login looks it up |
| `sso_synced_at` | `timestamp(6)` | |
| `study_self_reported` | `boolean NOT NULL DEFAULT false` | |

The migration SQL is hand-written rather than generated, because
`prisma migrate dev` turns a column rename into a destructive drop-and-add.
That would have thrown away every stored token and, worse, set the precedent
that renaming a column here loses data. The file says so at the top.

Note that a Prisma scalar list cannot be NULL, so an empty `study_programmes`
means either "never told" or "nothing on file"; `sso_synced_at` distinguishes
the two.

## Logging and the Technical admin group (29 Sep 2026)

Every login flow now writes one row to a new `system_logs` table —
`login_succeeded` with how the student was matched (`subject`,
`student_number`, `email`, `username` or `created`), or `login_failed` with the
error code. The IT admins read it under a new **Technical** group in the admin
nav: `/admin/system-logs` and `/admin/system-status` (SSO configuration,
discovery reachability, 24-hour counts, deployed migration). Details in
[`docs/architecture.md`](docs/architecture.md#system-logs). Migration
`20260929130952_add_system_logs`.

While generating it, `prisma migrate dev` wanted to **drop** the r-number index
and the `'{}'` defaults on `study_programmes` / `study_years`: the hand-written
SSO migration created them, but `schema.prisma` never declared them. The schema
now declares both, so the two agree again.

## Still open

1. **`src/lib/study-options.ts` is incomplete.** Only three enum values are
   known from the sample payload (`computer_science`, `cybersecurity`,
   `master_1`); the list was seeded with those plus a plausible
   bachelor/master year set. Paste `StudyProgramme` and `StudyYear` from the
   SSO's `schema.prisma` (around lines 394-450) to make it exact. Until then
   the onboarding form offers a short list, and a self-reported value could
   fail to match an SSO one.

   `VTK_SSO_WEBSITE_PROMPT.md` is a prompt to run with an agent inside the
   vtk.be repo. It collects this and the other facts below that could not be
   confirmed from here (exact discovery URL and issuer, consent behaviour for
   the silent re-login, the r-number format, client registration steps).

2. **The SSO credentials are empty.** `VTK_SSO_ISSUER`, `VTK_SSO_CLIENT_ID` and
   `VTK_SSO_CLIENT_SECRET` need filling in `.env`. The old `LITUS_*` lines were
   left in place rather than deleted — `LITUS_API_KEY` holds a real secret and
   `.env` is not in git, so removing it would have destroyed the only copy.
   Nothing reads them any more; delete them when you are happy.

   The redirect URI to register with the SSO is
   `<origin>/api/auth/oauth/callback`, or set `VTK_SSO_CALLBACK_URL` if it
   differs.

## Checks

`npm run build` passes — the project's only automated gate. The migration
applies cleanly and the resulting columns were verified directly in Postgres.

`npm run lint` is broken repo-wide and was left untouched: Next 16 removed
`next lint`, and the flat config throws a circular-structure error on top of
that. Pre-existing, unrelated to this change.

The branch was rebased onto `main` on 29 Sep 2026 (the CI/dev-deploy
pipeline). Merging to `main` now deploys to **dev**, not production — dev's
`.env` needs the `VTK_SSO_*` values before the login works there.
