You are working in the repository of the VTK website (vtk.be). The website runs an
OpenID Connect provider (better-auth's OIDC / SSO provider). A separate app, VTK
Career (career.vtk.be), is being built as a client of this provider: "Login with your
VTK account" for students. Its integration was written against a sample payload and a
claim registry, and a few facts still have to be confirmed from THIS codebase.

Your job is read-only research. Do NOT change, commit or push anything, and do NOT
print secrets (client secrets, signing keys, .env values, database URLs, real user
data). If a secret is relevant, say only where it is configured and whether it is set.

For every answer, cite the file path and line numbers you got it from. If something
cannot be determined from the code, write "NOT FOUND" and say where you looked — do
not guess. Where the code and the docs disagree, report both.

## What the client currently assumes (verify or correct each)

- Discovery document at `<issuer>/.well-known/openid-configuration`, where the issuer
  is a base URL we configure. Authorization-code flow with PKCE S256, `state` and
  `nonce`. Client authenticates at the token endpoint with `client_secret_basic`.
- Scopes requested: `openid profile email vtk:study_programme vtk:study_year
  vtk:student_number`. (Note: scopes singular, claims plural — confirm the exact
  spelling of both.)
- The ID token carries only standard `profile` + `email` claims; every `vtk:*` claim
  is returned by the userinfo endpoint only.
- Claims read: `sub`, `name`, `given_name`, `family_name`, `preferred_username`,
  `email`, `vtk:student_number`, `vtk:study_programmes` (string array),
  `vtk:study_years` (string array), `vtk:study_confirmed_year` (integer),
  `vtk:not_at_faculty` (boolean). Claims seen but ignored: `email_verified`,
  `vtk:onboarded`, `vtk:preferred_email`, `vtk:personal_email`,
  `vtk:email_preference`.
- Array values are the lowercased names of Prisma enums, e.g.
  `["computer_science"]`, `["master_1"]`.
- A claim the user did not grant, or that has no value, is ABSENT from the response —
  never `null`, never an empty string.
- Members who do not study at the engineering faculty (FIRW) get
  `vtk:not_at_faculty: true` and an empty `vtk:study_programmes` array.

## Questions

1. **Study enums (most important).** Give the complete `StudyProgramme` and
   `StudyYear` enums from `prisma/schema.prisma` (roughly lines 394–450), every value
   exactly as written. Then show exactly how a value is transformed into the claim
   (lowercased? any other mapping?). If the site has display labels for these values
   (Dutch and/or English — i18n files, UI constants), list them per value. Also:
   is there an "other"/"none" value, and what are the claims for a member with no
   study info at all?

2. **Every `vtk:*` scope and claim.** Find the claim registry / scope definitions. For
   each scope: its exact name, which claims it releases, whether it triggers a
   consent screen, and whether it is marked sensitive. For each claim: exact name,
   JSON type, whether it can be absent, empty or null, whether it is in the ID token,
   userinfo, or both, and what it means. Specifically confirm:
   - `vtk:study_confirmed_year`: what the number means (start year of the academic
     year, e.g. 2025 for 2025–2026?) and when it gets updated.
   - `vtk:not_at_faculty`: how it is set and whether it can change.
   - `vtk:student_number`: its exact format (e.g. `r0123456` — lowercase? with the
     letter?), whether it is validated, unique, and present for every student member.
   - `email`: is it the KU Leuven address, a personal address, or the member's chosen
     preferred address? Can it change? Is it unique?
   - `preferred_username`: where its value comes from and whether it is stable.
   - `sub`: what it is derived from (user id?) and whether it is stable for life,
     including across an account merge or email change.
   - Is there any claim for VTK membership status (paid member this year) or
     entitlements, and which scope releases it?

3. **Endpoints and tokens.** The exact discovery URL (better-auth sometimes serves it
   under `/api/auth/.well-known/openid-configuration` — which is it here?), and the
   exact `issuer` value the discovery document and ID tokens contain, for production
   and for any staging/dev deployment. The ID token signing algorithm, the `aud`
   value, whether `nonce` is echoed, token lifetimes (access, ID, refresh), and which
   token endpoint auth methods are accepted. Is PKCE required, optional or supported?
   Is there an `end_session_endpoint` (RP-initiated logout)?

4. **Consent and silent re-login.** The client caps student sessions at 24 hours and
   then silently sends the student back through the authorization endpoint, expecting
   to come straight back without seeing anything. Confirm:
   - How long is the website's own login session?
   - Is consent remembered per client and scope after the first time, or asked every
     time? Can a client be marked trusted / skip-consent, and how?
   - Is `prompt=none` supported, and what error does it return when the user is not
     signed in or has not consented?
   - What happens when the user declines a single scope (e.g. `vtk:student_number`) —
     does the whole flow fail with `access_denied`, or do they get a token without
     that claim?

5. **Client registration.** How is an OIDC client registered here — admin UI,
   database seed, config file, better-auth API, environment variables? Which fields
   are needed (redirect URIs, allowed scopes, client type, skip consent, logo/name
   shown on the consent screen)? Are redirect URIs matched exactly? Is there already
   a client for career.vtk.be or dev.career.vtk.be? Give step-by-step instructions to
   register two clients: production with redirect URI
   `https://career.vtk.be/api/auth/oauth/callback`, and dev with
   `https://dev.career.vtk.be/api/auth/oauth/callback` (plus
   `http://localhost:3000/api/auth/oauth/callback` if the dev instance allows it).

6. **Migration from the old site (LITUS).** The old VTK site (LITUS) handed the career
   app a username and email; the career app matches returning students on their
   r-number first, then email, then username. Is there anything in this repo about
   how LITUS accounts were migrated: did the r-number, email or username carry over,
   and in what form? Could one person have ended up with two accounts here?

7. **Testing.** How can a developer run this site and its OIDC provider locally, and
   are there seed / test users (with study info, and one with
   `not_at_faculty: true`)? Is there a staging instance a client can test against?

8. **Anything else a client should know**: rate limits, required headers, CORS,
   known bugs or TODOs in the OIDC code, planned changes to claim names or enums.

## Output

Write the answers to a single Markdown file named `career-sso-answers.md` at the repo
root (do not commit it), structured under the same eight numbered headings, followed
by a final section **"Assumptions that are wrong"** listing every assumption above
that the code contradicts. Keep enum lists and claim tables complete — they will be
copied verbatim into the career app.
