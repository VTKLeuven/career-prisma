# Authentication & authorization

Three identities coexist. Do not assume "the user" means one thing.

## Sessions

`src/lib/auth-session.ts` mints and verifies HMAC-signed cookie tokens
(`base64url(payload).hmac-sha256`) using `AUTH_SECRET` / `NEXTAUTH_SECRET`.
No JWT library, no server-side session store — the account is re-read from
PostgreSQL on every request.

- `career_session` → company user / admin, resolved by `getUserFromCookies()`
  in `src/lib/auth-server.ts`.
- `student_session` → student, resolved by `getStudentFromCookies()` in
  `src/lib/auth-student.ts`.

## Login routes

| Who | Entry | Mechanism |
|---|---|---|
| Company reps & admins | `/login` | email + argon2id password (`users.password`) |
| Students | `/student-login` | email + argon2id password (`students.password`) |
| Students via VTK | VTK SSO (OIDC) | hand-rolled in `src/lib/vtk-sso.ts`, entry `/api/auth/oauth/initiate`, callback `/api/auth/oauth/callback` |

Invitations (`src/lib/invite-token.ts`, `/accept-invite`) and password resets
(`src/lib/password-reset.ts`) both use hashed, timestamped single-use tokens.

## The VTK SSO

The new `vtk.be` runs better-auth's SSO provider — an ordinary OIDC
authorization-code provider with discovery, PKCE and a userinfo endpoint. It
replaced LITUS, which the old site spoke; `src/lib/oauth.ts` is gone.

Three files, and the split between them is deliberate:

- `src/lib/vtk-sso.ts` — the protocol. Discovery (cached an hour), PKCE, state,
  nonce, token exchange, userinfo. No OIDC library, for the same reason
  `auth-session.ts` mints its own cookies.
- `src/lib/vtk-sso-claims.ts` — **the only file that knows the provider's claim
  names.** When the SSO's claim registry changes, this is the edit.
- `src/lib/repos/students.ts` — `upsertStudentFromSso()` writes the result.

### What the claims look like

Properties of the provider's contract that the code depends on, confirmed
against the vtk.be source on 29 Sep 2026 (`career-sso-answers.md` in the repo
root holds the full research, with file references into that repo):

- **Issuer** `https://vtk.be/api/auth/better` (dev.vtk.be has its own, with a
  separate client). Discovery is `<issuer>/.well-known/openid-configuration`.

- **The ID token carries only `profile` and `email` claims.** Everything under
  `vtk:` — study programme, year, r-number — is userinfo-only. That is why the
  flow always calls userinfo instead of stopping at the ID token.
- **Claims are absent or valued, never null.** A student who declined a scope
  has no key at all, so a missing claim must never be written to the database
  as a blank. The exceptions: the study arrays are **present as `[]`** when
  empty, and the booleans are always present.
- **`vtk:study_programmes` and `vtk:study_years` are arrays** of lowercased
  enum values (`["computer_science"]`, `["master_1"]`), because a member can
  read two programmes at once. `src/lib/study-options.ts` holds this app's copy
  of that vocabulary, and has to stay in step with the SSO's enums. Unknown
  values from the SSO are stored anyway — vtk.be has added programmes before.
- **`vtk:student_number` is not always lowercase.** vtk.be admins can type or
  bulk-import `R0123456`, so the app lowercases it.
- **`email` is usually, not always, the KU Leuven address**, and a vtk.be admin
  can change it. `preferred_username` is just its local part — never a key.
- **`students.email` stores `vtk:preferred_email`, not `email`.** The
  preferred address is the member's personal one if they chose it on vtk.be,
  else the same as `email`; student mail goes to `students.email`, except that
  a form's email field is prefilled with it and a student who types another
  address there is mailed at that one. It is
  re-read on every login, so changing it on vtk.be moves the address on the
  next one. If another student row already holds it, the row keeps its old
  address and the login logs `email_conflict` (two accounts for one person).
- **Consent is remembered only as a whole.** vtk.be skips its consent screen
  when every requested scope was granted before. Declining the sensitive
  `vtk:student_number` does not fail the login, it just leaves the claim out.

The ID token's signature is **not** verified. That is safe here and only here:
it arrives on our own TLS connection to the token endpoint, authenticated with
the client secret, so nothing could have substituted it (OIDC Core 3.1.3.7).
`iss`, `aud`, `exp` and `nonce` are still checked.

### Matching a returning student

`findExistingStudentRow()` tries, in order: `sso_subject`; the r-number
against `student_number`; the r-number against **`username`**; then email — the preferred address first, so a password account made with a
personal address is joined to the SSO identity, then the vtk.be login address.

The third step is the LITUS migration. The old login stored the LITUS username
and never filled `student_number` (a newer column), and LITUS usernames are
r-numbers — so for a returning pre-SSO student, `username` is where the
r-number is. vtk.be migrated no LITUS data, so the r-number is the only
identifier the two systems share that a student cannot change, which is why
`vtk:student_number` is requested despite its sensitive-consent prompt. Both
r-number comparisons are case-insensitive.

A match on anything but the subject adopts the row and stamps the subject on
it, so later logins take the first path. Rows that already carry a *different*
subject are never adopted. New rows get the r-number as `username`, or the
email when there is none.

### Refresh

There is no background refresh and no `offline_access`: study programme, year
and r-number are re-read on **every completed login flow** and written straight
onto the `students` row. A login is the only moment this app hears from the
SSO.

That is what pays for the short session below — and it is why student sessions
are capped at 24 hours rather than 30 days.

### Logging

Every login flow ends in one `vtk_sso` row in `system_logs`:
`login_succeeded` (with **how** the student was matched — `subject`,
`student_number`, `legacy_username`, `email`, or `created`) or `login_failed` (with
the error code). A failure to start the flow is `initiate_failed`, and claims
the app does not recognise are `unmapped_claims`. A declined consent logs as
`info` and an expired flow as `warn`; everything else is `error`. Read them at
`/admin/system-logs?source=vtk_sso`; `/admin/system-status` summarises them.

### Sessions and silent re-authentication

Student sessions last **24 hours** (`STUDENT_SESSION_MAX_AGE`). The SSO's own
session is much longer, so an expired session costs the student a redirect they
never see rather than a login screen.

With no middleware, that bounce lives at `/student-login` — the single funnel
every "you need to sign in" link in the app points at. It is a server component
that redirects to `/api/auth/oauth/initiate?silent=1` when the session is gone
but the `student_sso` hint cookie is present.

The hint cookie stores the scopes the student granted last time, and a
`silent=1` flow requests only those. Without that, a student who declined
`vtk:student_number` would face vtk.be's consent screen at every daily bounce,
since vtk.be only skips it when all requested scopes were granted before. A
login the student starts themselves still asks for everything, so they can
change their mind.

The hint cookie is what tells an SSO student from an external one; it holds no
privilege, outlives the session on purpose, and is cleared on logout so signing
out does not sign you straight back in. `?sso=0` forces the form — the error
page at `/auth/callback` uses it, because bouncing a failed SSO login straight
back into the SSO would loop.

A successful login redirects straight from `/api/auth/oauth/callback` to its
destination; `/auth/callback` is only reached on failure. Links to our own
pages must stay **relative**: the session cookie is host-only, so an absolute
`https://www.career.vtk.be/...` link from `career.vtk.be` (or dev → prod)
arrives without a session while the domain-wide hint cookie still triggers the
bounce. `toSitePath()` in `src/lib/site-path.ts` strips our own hosts, and an
event registration form sets its event page's `registration_link` to
`/forms/<slug>` whenever it is saved.

Password ("external") students are **not** capped at 24 hours: they have no SSO
to bounce through, so it would only mean a daily password prompt.

### Study info: who may change what

vtk.be is the source of truth for an SSO student's study programme and year.
`studyEditability()` in `src/lib/study-options.ts` holds the rule, and both the
pages and the server action (`app/actions/student-study.ts`) apply it:

- **Password students** have no other source and edit everything.
- **SSO students** see their study info greyed out, change it at
  `vtk.be/account`, and pull it in with "Refresh from vtk.be" — which just runs
  the login flow again, the only way this app hears from the SSO.
- **Exception:** a member who ticked "not studying at the faculty" on vtk.be
  (`vtk:not_at_faculty`) chooses their programme on Career, and that choice
  survives later logins. The flag is independent of vtk.be's programme list,
  which may still be filled.
- **Empty claims never overwrite.** Members outside FIRW, alumni and staff
  arrive with `[]`; the callback sends them to `/student/study-details` and
  whatever is empty there is open. When vtk.be later sends a value, it wins.

`sso_study_programmes` / `sso_study_years` / `sso_locale` keep exactly what
the SSO last sent, apart from the values in use. The account page shows them
under "From vtk.be" — the quickest way to see whether the claims arrive.

### The student account page

`/student/account` (linked from the student menu in the site header) holds a
student's details, password, preferred language, study info and account
deletion. For an SSO student vtk.be owns name, email and r-number and there is
no password, so those show read-only with a link to vtk.be. A password student
edits them; changing the login email asks for the current password, so a
stolen session alone cannot move the account to another inbox.

`preferred_language` ("nl" / "en") is Career's own setting. vtk.be's `locale`
claim only seeds it until the student picks one. Nothing reads it yet — it is
meant for mails and form pre-filling.

Deleting goes through an "are you sure?" dialog, then `deleteStudent()`
(which also removes liked companies and matching responses), clears the
session and the `student_sso` hint, and logs `student_accounts/account_deleted`.
An SSO student who signs in again starts with a new, empty account.

## Roles

Four roles exist. **Their names do not mean what they look like** — the sales
role is the one called "VTK Career", and "Administrator" is the internal support
role. Always match on the id.

| Role | Id | May sign in | Salesperson |
|---|---|---|---|
| `Company Rep` | `d5475bf4-…` | yes | no |
| `VTK Career` | `7b128ef4-…` | yes | **yes** |
| `Administrator` | `c4e63615-…` | yes | no |
| `Student` | `daf734af-…` | no | no |

Two places encode this, and they must stay in sync (a third,
[`src/lib/roles.ts`](../src/lib/roles.ts), carries the same ids for client
components that need to branch on a role, but grants nothing):

- `ALLOWED_ROLE_IDS` in `src/app/api/login/route.ts` — who may sign in. A role
  that is missing here gets the same 401 as a wrong password, so an account can
  look perfectly healthy in the database and still be locked out.
- `VTK_CAREER_ROLE_ID` / `ADMINISTRATOR_ROLE_ID` in `src/lib/auth-server.ts` —
  who gets `admin: true`.

"Salesperson" is not a separate flag: `listSalespersons()` and
`fetchSalespersonByID()` in `src/lib/repos/users.ts` filter on the **VTK Career**
id, and every salesperson surface goes through them — the company contact-person
picker in `/admin/companies-events`, and the team section on the public homepage
via `/api/homepage`. That single filter is what keeps Administrator accounts
fully privileged but unadvertised, with no rule of their own.

## Authorization

There is **no middleware**. Each page, server action and route handler checks
for itself:

- `requireAdminUser()` in `src/lib/auth-server.ts` — throws on non-admin.
- `hasCompanyPageAccess()` in `src/lib/utils/company-access.ts` — company
  scoping.

**When you add an admin page, action, or API route, add the check.** Nothing
upstream will do it for you.
