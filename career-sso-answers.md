# VTK SSO: answers for the VTK Career integration

Research against the vtk-website-new repo at commit `0aeb0f0d` (branch `main`), 2026-09-29.
Plugin versions: `@better-auth/oauth-provider` 1.7.5 (`packages/auth/node_modules/@better-auth/oauth-provider/package.json:3`).
Paths below are relative to the repo root. `PLUGIN/` is short for
`packages/auth/node_modules/@better-auth/oauth-provider/dist/`.

No secrets are reproduced here. Where a secret matters, only its location is named.

---

## 1. Study enums

### `StudyYear` (`packages/db/prisma/schema.prisma:437-444`)

| Prisma value | Claim value | NL label | EN label |
|---|---|---|---|
| `BACHELOR_1` | `bachelor_1` | 1ste bachelor | 1st bachelor |
| `BACHELOR_2` | `bachelor_2` | 2de bachelor | 2nd bachelor |
| `BACHELOR_3` | `bachelor_3` | 3de bachelor | 3rd bachelor |
| `MASTER_1` | `master_1` | 1ste master | 1st master |
| `MASTER_2` | `master_2` | 2de master | 2nd master |

### `StudyProgramme` (`packages/db/prisma/schema.prisma:446-467`)

Listed in schema order (which is also the order shown to members, `apps/web/lib/profile.ts:68-86`).

| Prisma value | Claim value | NL label | EN label |
|---|---|---|---|
| `ARCHITECTURE` | `architecture` | Architectuur | Architecture |
| `BIOMEDICAL` | `biomedical` | Biomedische Technologie | Biomedical Engineering |
| `COMMON_BACHELOR` | `common_bachelor` | Algemene Bachelor | Common Bachelor |
| `CIVIL` | `civil` | Bouwkunde | Civil Engineering |
| `CHEMICAL` | `chemical` | Chemische Ingenieurstechnieken | Chemical Engineering |
| `COMPUTER_SCIENCE` | `computer_science` | Computerwetenschappen | Computer Science |
| `CYBERSECURITY` | `cybersecurity` | Cybersecurity | Cybersecurity |
| `DIGITAL_HUMANITIES` | `digital_humanities` | Digital Humanities | Digital Humanities |
| `ELECTRICAL` | `electrical` | Elektrotechniek | Electrical Engineering |
| `ENERGY` | `energy` | Energie | Energy Engineering |
| `ARTIFICIAL_INTELLIGENCE` | `artificial_intelligence` | Artificiële Intelligentie (ir.) | Artificial Intelligence (ir.) |
| `MATERIALS` | `materials` | Materiaalkunde | Materials Engineering |
| `MOBILITY_SUPPLY_CHAIN` | `mobility_supply_chain` | Mobility & Supply Chain | Mobility & Supply Chain |
| `NANO` | `nano` | Nanowetenschappen | Nano engineering |
| `URBANISM` | `urbanism` | Urbanism Landscape and Planning | Urbanism Landscape and Planning |
| `MATHEMATICAL` | `mathematical` | Wiskundige Ingenieurstechnieken | Mathematical Engineering |
| `MECHANICAL` | `mechanical` | Werktuigkunde | Mechanical Engineering |

Labels: `packages/i18n/src/messages/nl.json:377-402` and `packages/i18n/src/messages/en.json:377-402`
(under the `onboarding` key, `years` and `programmes`). The schema comment confirms labels live only there
(`schema.prisma:446-447`).

Schema comment on `MOBILITY_SUPPLY_CHAIN` (`schema.prisma:461-462`): master only, like Energy and Cybersecurity.
For how VTK itself groups programmes for Career mailings (which programmes are master-only, Architecture having
its own 1st bachelor, Common Bachelor having no sublists) see `apps/web/lib/careerLists.ts:79-106`.

### Transformation into the claim

Both `vtk:study_programmes` and `vtk:study_years` use the `enumArray` transformer
(`packages/auth/src/lib/claims.ts:302-322`):

```ts
enumArray: (value) =>
  Array.isArray(value) ? value.filter((item) => item != null).map((item) => String(item).toLowerCase()) : null,
```

(`packages/auth/src/lib/transformers.ts:80-81`). So: plain lowercase of the Prisma name, nothing else. No
renaming, no label mapping. Order is the order stored in the Postgres array (the order the checkboxes were
submitted, which follows the list order above; not guaranteed, treat as a set).

### "Other" / "none"

- There is **no** `OTHER` or `NONE` value in either enum.
- "Not at the engineering faculty" is deliberately **not** an enum value; it is the separate boolean
  `User.notAtFaculty` (`schema.prisma:633-636`).
- Both arrays default to `[]` (`schema.prisma:631-632`).

### Claims for a member with no study info at all

With scopes `vtk:study_programme` + `vtk:study_year` granted and nothing filled in:

```json
{
  "vtk:study_programmes": [],
  "vtk:not_at_faculty": false,
  "vtk:study_years": []
}
```

`vtk:study_confirmed_year` is absent (null in DB). Empty arrays are **present**, not absent: `enumArray` turns
`[]` into `[]`, and only `null`/`undefined` are dropped (`packages/auth/src/server/claims.ts:478-481`).

When a member unticks "I am a student", the save sets `studyYears = []`, `studyProgrammes = []`,
`notAtFaculty = false` and `studyConfirmedYear = null` (`apps/web/app/actions/onboarding.ts:149-164`,
`:343`, `:485`). So alumni, staff and "not studying" members look exactly like the example above.

---

## 2. Every scope and claim

Sources: scope registry `packages/auth/src/lib/scopes.ts:23-112`, claim registry
`packages/auth/src/lib/claims.ts:176-362`, resolver `packages/auth/src/server/claims.ts:463-489`, plugin wiring
`packages/auth/src/auth.ts:120-157`.

### Scopes

Exact spelling: scopes are **singular** (`vtk:study_programme`, `vtk:study_year`, `vtk:student_number`); the
array claims are **plural** (`vtk:study_programmes`, `vtk:study_years`). `vtk:student_number` is the same word
for scope and claim.

| Scope | Releases | Sensitive | Pre-selected when an admin creates a client |
|---|---|---|---|
| `openid` | `sub` (protocol) | no | yes |
| `profile` | `name`, `given_name`, `family_name`, `preferred_username`, `picture`, `locale`, `updated_at`, `vtk:onboarded` | no | yes |
| `email` | `email`, `email_verified`, `vtk:preferred_email` | no | yes |
| `address` | `address` | yes | no |
| `phone` | nothing (no phone field is mapped; `docs/sso.md:466-467`) | yes | no |
| `offline_access` | a refresh token | yes | no |
| `entitlements` | `permissions` | no | yes |
| `vtk:study_programme` | `vtk:study_programmes`, `vtk:not_at_faculty` | no | no |
| `vtk:study_year` | `vtk:study_years`, `vtk:study_confirmed_year` | no | no |
| `vtk:student_number` | `vtk:student_number` | **yes** | no |
| `vtk:contact` | `birthdate`, `vtk:personal_email`, `vtk:email_preference` | yes | no |

Consent screen: **every** scope goes through the consent screen unless the client has `skipConsent` (see 4).
`openid` is not shown as a line (`apps/web/app/[locale]/inloggen/consent/page.tsx:112-114`). "Sensitive" only
changes the UI: sensitive scopes get their own checkbox (pre-ticked) and a warning; non-sensitive scopes are
listed without a checkbox and cannot be declined individually
(`apps/web/app/[locale]/inloggen/consent/ConsentScreen.tsx:59`, `:121-147`). Consent strings (NL/EN) are in
`scopes.ts`, e.g. `vtk:student_number` = "Je studentennummer" / "Your student number" (`scopes.ts:95-103`).

### Claims

"Absent" = the key is left out. Rule: a claim whose transformed value is `null`/`undefined` is omitted
(`server/claims.ts:479-481`); transformers are null-safe (`lib/transformers.ts:7-9`). Neither `null` nor `""`
is ever emitted by our registry. Exceptions noted per row.

| Claim | Scope | JSON type | Where | Can be absent / empty | Source and meaning |
|---|---|---|---|---|---|
| `sub` | openid | string | ID token + userinfo | never absent | `User.id` (a cuid), see below |
| `name` | profile | string | ID + userinfo | never absent (column is required) | `User.name`, display name (`schema.prisma:494-498`) |
| `given_name` | profile | string | ID + userinfo | absent from the **ID token** when `firstName` is null; in **userinfo** the plugin falls back to splitting `name` (see note A) | `User.firstName` |
| `family_name` | profile | string | ID + userinfo | same as `given_name` | `User.lastName` |
| `preferred_username` | profile | string | ID + userinfo | never absent | local part of `User.email` (`claims.ts:199-205`, `transformers.ts:67`) |
| `picture` | profile | string (absolute URL) | ID + userinfo | absent without avatar | uploaded avatar, else image from SSO provider |
| `locale` | profile | string | ID + userinfo | never absent in practice | `nl-BE` or `en` (`transformers.ts:72-78`) |
| `updated_at` | profile | integer (unix s) | userinfo | never absent | `User.updatedAt` |
| `vtk:onboarded` | profile | boolean | userinfo | never absent (`isNotNull` always returns a boolean, `transformers.ts:53-55`) | onboarding completed |
| `email` | email | string | ID + userinfo | never absent | `User.email`, see below |
| `email_verified` | email | boolean | ID + userinfo | never absent | `User.emailVerified` |
| `vtk:preferred_email` | email | string | userinfo | never absent | personal address if the member chose PERSONAL and filled it in, else `email` (`server/claims.ts:409-410`) |
| `address` | address | object (OIDC §5.1.1) | userinfo | absent when no address | kot address, `country: "BE"` |
| `birthdate` | vtk:contact | string `YYYY-MM-DD` | userinfo | absent when unknown | |
| `vtk:personal_email` | vtk:contact | string | userinfo | absent when unknown | |
| `vtk:email_preference` | vtk:contact | string `university` or `personal` | userinfo | never absent | `enumValue` lowercases (`transformers.ts:83`) |
| `vtk:study_programmes` | vtk:study_programme | string[] | userinfo | **never absent; can be `[]`** | see section 1 |
| `vtk:not_at_faculty` | vtk:study_programme | boolean | userinfo | never absent (column is `NOT NULL DEFAULT false`) | see below |
| `vtk:study_years` | vtk:study_year | string[] | userinfo | **never absent; can be `[]`** | see section 1 |
| `vtk:study_confirmed_year` | vtk:study_year | integer | userinfo | absent when never confirmed or not a student | see below |
| `vtk:student_number` | vtk:student_number | string | userinfo | absent when no r-number | see below |
| `permissions` | entitlements | string[] | userinfo only | absent if the client id cannot be resolved; `[]` possible | this member's codes within **this** client (`claims.ts:338-361`) |

The ID token carries **no** `vtk:*` claim; all have `destinations: ['userinfo']` (`claims.ts:227-336`).
Custom claims under `access_token` destination: none are defined, and access tokens are opaque
(`auth.ts:139-142`), so there is nothing to read from them.

**Note A (userinfo baseline claims).** In userinfo the plugin first builds its own standard claims
(`name`, `picture`, `given_name`, `family_name`, `email`, `email_verified`) from the better-auth user, and then
our registry values override them (`PLUGIN/introspect-njKASm3q.mjs:139-164`, `:1139-1144`, `:1232-1256`).
Because our resolver drops null values instead of overriding with null, a member without `firstName`/`lastName`
still gets `given_name`/`family_name` in userinfo, derived by the plugin from splitting `name`, while the ID
token omits them (the ID token starts with every standard claim set to `undefined`,
`PLUGIN/introspect-njKASm3q.mjs:1260`, `:1407-1411`). In practice onboarding requires first and last name
(`apps/web/app/actions/onboarding.ts:168-169`), so this only affects accounts that have not onboarded.

**Inactive users.** `resolveClaims` returns `{}` for a deactivated user (`server/claims.ts:466-467`), but the
plugin's baseline claims from note A are still returned by userinfo. Deactivated users cannot get a new session
at all (`auth.ts:237-252`).

### Specific confirmations

**`vtk:study_confirmed_year`.** The **start year** of the academic year: `2026` means 2026-2027
(`schema.prisma:688-697`, `packages/auth/src/lib/workingYear.ts:4`). Written with `currentStudyYear()`, which
flips on **14 September** Brussels time (`workingYear.ts:40-42`, `:84-86`), whenever a student saves their study
profile: onboarding, the yearly confirmation gate, or `/account` (`apps/web/app/actions/onboarding.ts:318`,
`:343`, `:479`, `:485`; `schema.prisma:1045-1054`). Set to `null` when the member is not a student. The yearly
confirmation gate opens on **21 September** (`workingYear.ts:44-46`, `:97-120`) and blocks site pages until the
student re-confirms (production only, `apps/web/proxy.ts:124-129`). So between 14 and 21 September a value of
last year is still considered valid by VTK. To tell whether study data is current, compare it with the academic
year: `confirmed_year >= (today >= Sep 21 ? thisYear : thisYear - 1)` mirrors VTK's own rule.

**`vtk:not_at_faculty`.** Self-declared checkbox "Ik studeer niet aan de faculteit" / "I am not studying at the
faculty" in the study fieldset, shown only for students (`apps/web/components/profile/StudyStatusFields.tsx:160-200`;
strings `nl.json:343-344`, `en.json:343-344`). Saved as-is for students, forced to `false` for non-students
(`onboarding.ts:154`). It can change at any time the member edits their profile or re-confirms. It is
**independent** of the programme checkboxes: nothing clears `studyProgrammes` when it is ticked
(`onboarding.ts:149-164`), so `vtk:not_at_faculty: true` can come together with a non-empty
`vtk:study_programmes`. There is a separate, authoritative faculty flag from KU Leuven (`User.firwStudent`,
`schema.prisma:508-512`, synced on each KU Leuven login in `packages/auth/src/logins/kul.ts:252-258`), but it is
**not exposed as any claim**.

**`vtk:student_number`.** From `User.rNumber` via the `string` transformer (`claims.ts:330-336`), no
normalisation at claim time.
- Format: `r` + exactly 7 digits (`apps/web/lib/profile.ts:30-34`). Lowercase, letter included.
- Sources and validation:
  - KU Leuven login: extracted from any KU Leuven claim matching `/\br\d{7}\b/i`, lowercased
    (`kul.ts:94-101`); stored only when the account is created (`kul.ts:223-233`, `:268`) and then marked
    read-only (`rNumberFromKul`).
  - Member self-entry (onboarding / account): trimmed, lowercased, validated against the regex
    (`onboarding.ts:171-176`); editable only when not from KU Leuven (`onboarding.ts:305`, `:328`).
  - Admin edit (`apps/web/app/actions/users-groups.ts:79-81`) and admin CSV bulk import
    (`users-groups.ts:430-457`): **only trimmed, not lowercased and not validated**. The KU Leuven linking code
    explicitly notes that uppercase values like `R0123456` exist from those paths (`kul.ts:122-130`).
  - So: normalise on your side (`toLowerCase()`), and do not assume the regex holds for every row.
- Unique: `@unique` on `User.rNumber` (`schema.prisma:502`). That is a case-sensitive unique index in Postgres,
  so `r0123456` and `R0123456` could in theory coexist.
- Not present for every student: it is optional in the profile (`onboarding.ts:170`), staff (u-numbers) never
  have one (`kul.ts:83-86`), and accounts created without KU Leuven login may lack it.

**`email`.** `User.email`, the login address (`claims.ts:238-248`). Code comments and docs say it is "always
the university address" (`claims.ts:239-242`, `docs/sso.md:94-97`), but the code does **not** guarantee that:
- KU Leuven login: the KU Leuven address, **or** the address of an existing account that already carries the
  same r-number, which can be a private address (`kul.ts:241-261`, `packages/auth/src/logins/kul-link.ts:45-69`).
- Self-registered accounts (for people without a KU Leuven login) use whatever address they signed up with
  (`schema.prisma:679-687`).
- Admin-created accounts and CSV imports use whatever address the admin typed (`users-groups.ts:50-52`, `:108`,
  `:466-481`).

It is unique (`schema.prisma:501`, stored lowercase by all write paths above). It is **not** the preferred
address; that is `vtk:preferred_email`. Can it change: not by the member (the profile form has no email field
for it; `schema.prisma:503-506` describes it as read-only like the r-number), not by later KU Leuven logins
(better-auth copies nothing onto an existing account, `kul-link.ts:5-8`), but **yes by an admin** with
`users.edit` (`users-groups.ts:61-62`, `:107-108`).

**`preferred_username`.** Local part of `User.email` (`claims.ts:199-205`). Stable only as long as `email` is.
For a KU Leuven address it is whatever precedes `@` (for students typically `firstname.lastname`, not the
r-number; the site does not control it). Not unique across domains (e.g. `jan` at two domains). Do not key on it.

**`sub`.** `User.id`, a Prisma `cuid()` (`schema.prisma:493`), returned as-is for `subjectType` public
(`PLUGIN/utils-CWjOhEQb.mjs:784-787`). If a client is set to `pairwise` (only possible when
`OAUTH_PAIRWISE_SECRET` is configured, `auth.ts:182-187`) it is an HMAC per client instead. It does not change
on an email change or when a KU Leuven login is linked to an existing account (linking attaches to the existing
user row). There is **no account-merge feature** in the codebase (searched `apps/web` and `packages` for
merge / samenvoeg: nothing), so if two accounts exist for one person they keep two different `sub`s. Account
deletion (`eraseUserData`, `apps/web/app/actions/users-groups.ts:15`) removes it for good.

**Membership / entitlements.** There is **no** claim for paid VTK membership. Membership exists in the DB
(`model Membership`, per academic year, `schema.prisma:1007-1043`) but no claim reads it; a former
`vtk:membership` scope was removed from the registry (`docs/sso.md:470-475`). The only entitlement-like claim is
`permissions` (scope `entitlements`): the codes this client itself defines (e.g. `career.admin`) that the member
holds via a role at VTK (`docs/sso.md:147-205`). Tokens carrying `entitlements` expire after 10 minutes
(`auth.ts:109-120`). VTK internal roles/posts are deliberately not released (`claims.ts:342-347`).

---

## 3. Endpoints and tokens

**Issuer** = `BETTER_AUTH_URL` + `/api/auth/better` (`packages/auth/src/index.ts:50-56`, `auth.ts:48-49`;
`iss` is the better-auth base URL, `PLUGIN/introspect-njKASm3q.mjs:1413`, discovery
`PLUGIN/authorize-riRRCSbC.mjs:692`, which strips a trailing slash).

| Deployment | Issuer | Evidence |
|---|---|---|
| Production | `https://vtk.be/api/auth/better` | deploy target `https://vtk.be` (`.github/workflows/deploy-prod.yml:72`); Vaultwarden default authority `https://vtk.be/api/auth/better` (`infra/docker-compose.yml:664`) |
| Dev / staging | `https://dev.vtk.be/api/auth/better` | deploy target `https://dev.vtk.be` (`.github/workflows/deploy-dev.yml:200`) |
| Local | `http://localhost:3000/api/auth/better` | `.env.example:175` |

The actual `BETTER_AUTH_URL` of prod and dev is set in the server environment, not in the repo; the values above
are inferred from the deploy URLs. Confirm with `curl`.

**Discovery URL**: `<issuer>/.well-known/openid-configuration`, i.e.
`https://vtk.be/api/auth/better/.well-known/openid-configuration` (`docs/sso.md:32-36`, `:279-282`).
**Not** `/api/auth/.well-known/...` and not at the host root. The RFC 8414 form
`https://vtk.be/.well-known/oauth-authorization-server/api/auth/better` is rewritten to it
(`apps/web/proxy.ts:10-14`, `:216-221`).

Endpoints advertised (all under the issuer, `PLUGIN/authorize-riRRCSbC.mjs:690-794`):
`/oauth2/authorize`, `/oauth2/token`, `/oauth2/userinfo`, `/jwks`, `/oauth2/introspect`, `/oauth2/revoke`,
`/oauth2/end-session`.

| Item | Value | Source |
|---|---|---|
| ID token alg | `EdDSA` (Ed25519), the better-auth `jwt` plugin default; no `keyPairConfig` is set | `auth.ts:63`, `PLUGIN/authorize-riRRCSbC.mjs:773-778`, `PLUGIN/introspect-njKASm3q.mjs:1402-1404`. Make sure your JOSE library accepts EdDSA; there is no RS256. The actual key type sits in the `jwks` DB table: NOT verifiable from code. |
| `aud` | the client's `client_id` (string) | `PLUGIN/introspect-njKASm3q.mjs:1415` |
| `nonce` | echoed unchanged when sent | `PLUGIN/introspect-njKASm3q.mjs:1416` |
| Other ID token claims | `auth_time`, `acr: "0"`, `at_hash`, `iat`, `exp`; `sid` only if the client has end-session enabled | `PLUGIN/introspect-njKASm3q.mjs:1406-1420` |
| Authorization code lifetime | 600 s | `PLUGIN/authorize-riRRCSbC.mjs:4201` |
| Access token | opaque, prefix `vtk_at_`, 3600 s; 10 min when `entitlements` is in scope | `PLUGIN/authorize-riRRCSbC.mjs:4202`, `auth.ts:120`, `:176-180` |
| ID token lifetime | 36000 s (10 h), plugin default, not overridden | `PLUGIN/introspect-njKASm3q.mjs:1394` |
| Refresh token | only when `offline_access` is requested and granted; 30 days; prefix `vtk_rt_` | `PLUGIN/introspect-njKASm3q.mjs:1799`, `PLUGIN/authorize-riRRCSbC.mjs:4204` |
| Token endpoint auth | `client_secret_basic` **and** `client_secret_post` both work for every confidential client (a wrapper rewrites one into the other to match what is stored). Discovery also lists `private_key_jwt` (not used here). | `packages/auth/src/apiHandlers/apiHandler.ts:23-31`, `:58-160`, `docs/sso.md:408-428`. Basic credentials are form-url-decoded per RFC 6749 (`apiHandler.ts:39-56`). |
| PKCE | **required** (S256 only) unless the client row has `requirePKCE = false`; the admin wizard never sets that | `PLUGIN/utils-CWjOhEQb.mjs:836-845`, `PLUGIN/authorize-riRRCSbC.mjs:5587-5597`, `docs/sso.md:26`, `:237` |
| `state` | passed through; errors are also returned with `state` | `PLUGIN/authorize-riRRCSbC.mjs:5562` etc. |
| `iss` on the redirect | the authorization response carries an `iss` parameter (RFC 9207) | `PLUGIN/authorize-riRRCSbC.mjs:726` |
| Response types / modes | `code`, `query` only | `PLUGIN/authorize-riRRCSbC.mjs:699-700` |
| Userinfo access token | `Authorization: Bearer` header, or `access_token` in a POST body (not both) | `PLUGIN/introspect-njKASm3q.mjs:1169-1185` |

**RP-initiated logout.** `end_session_endpoint` is advertised (`PLUGIN/authorize-riRRCSbC.mjs:779`), but it only
works for a client whose `enableEndSession` is true (`PLUGIN/authorize-riRRCSbC.mjs:589`, `:648`, `:659`), and
neither the admin UI nor `createSsoClient` exposes that field (`packages/auth/src/server/sso.ts:104-150`; no
match for `enableEndSession` in `apps/web` outside MCP read/test). Also `postLogoutRedirectUris` is not settable
from the UI. So: not usable without a direct DB change.

---

## 4. Consent and silent re-login

**VTK login session**: 30 days, sliding (refreshed at most once a day on use); session cookie cache 5 minutes
(`auth.ts:255-274`). Cookie prefix `vtk`, cross-subdomain cookies in production (`auth.ts:360-365`).

**Consent is remembered per user + client** (one `oauthConsent` row with the granted scope list). On each
authorize the plugin skips the screen only when **every requested scope** is already in that row
(`PLUGIN/authorize-riRRCSbC.mjs:5660-5680`). "Remember this choice" is not a checkbox: consent is always stored
(`docs/sso.md:445`). Members can revoke it at `/account/verbonden-apps` (`docs/sso.md:75`).

**Trusted / skip consent**: yes, `OauthClient.skipConsent` (`schema.prisma:5431`), a checkbox in the admin wizard
and editor (`apps/web/app/[locale]/admin/sso/actions.ts:55`, `:98`, `:139`, `:150`). With it the plugin issues a
code immediately after the access gate (`PLUGIN/authorize-riRRCSbC.mjs:5651-5659`); the member never sees which
data is shared, and cannot decline `vtk:student_number`.

**`prompt=none`**: supported (`PLUGIN/authorize-riRRCSbC.mjs:782-788`). Errors, returned to the `redirect_uri`
with `state` and `iss`:

| Situation | `error` |
|---|---|
| No VTK session (or `max_age` exceeded) | `login_required` |
| Missing consent for any requested scope | `consent_required` |
| Blocked by the access gate (restricted client) | `interaction_required` (a known wrong code; `docs/sso.md:460-465`) |

(`PLUGIN/authorize-riRRCSbC.mjs:5602-5605`, `:5629-5631`, `:5677-5680`)

**Declining a single scope.** Only sensitive scopes can be declined (non-sensitive have no checkbox, see 2). If
the member unticks `vtk:student_number`, the flow **succeeds**, the token is issued for the remaining scopes,
and `vtk:student_number` is simply absent from userinfo. The token response's `scope` field lists what was
actually granted. (`ConsentScreen.tsx:59`, `:73-78`; `inloggen/consent/actions.ts:32-34`.) Only "Weigeren"
(deny all) gives `access_denied` (`PLUGIN/authorize-riRRCSbC.mjs:57`).

**Consequence for your 24 h silent re-login (important).** Because the stored consent then lacks
`vtk:student_number`, **every later authorize that requests it again fails the "all scopes consented" check**: the
member sees the consent screen again each time, or with `prompt=none` you get `consent_required`. Options:
(a) after a login, request next time only the scopes returned in the previous token response's `scope`;
(b) handle `consent_required` by falling back to an interactive login; (c) register the client with
`skipConsent` (then nobody can decline).

Other things that break "comes straight back":
- A member whose annual study confirmation is due (from 21 September) or who has not onboarded is redirected by
  the site's gate on any **page** (production only, `apps/web/proxy.ts:105-129`). The authorize endpoint itself is
  under `/api` and not gated (`proxy.ts:184-186`), so with existing consent they come straight back, carrying
  last year's study claims. If they must see the consent or login page, the gate hijacks it and the OAuth query
  is lost (`docs/sso.md:468-469`).
- Session older than 30 days of inactivity: login required (KU Leuven login, interactive).

---

## 5. Client registration

**How**: admin UI at `/admin/sso/nieuw` (3-step wizard), requires permission `oauth.client.edit`
(`docs/sso.md:65-75`, `:209-216`, `:230-240`). It calls better-auth's `adminCreateOAuthClient`
(`packages/auth/src/server/sso.ts:122-150`). Clients are **not** seeded, not in config files and not in env vars.
Dynamic registration (`/oauth2/register`) is not enabled (discovery only advertises it when
`allowDynamicClientRegistration` is set, `PLUGIN/authorize-riRRCSbC.mjs:696`, `:746`; `auth.ts` does not set it).

Fields in the wizard (`apps/web/app/[locale]/admin/sso/actions.ts:50-121`): name, redirect URIs, type (`web` /
`native` / `user-agent-based`), `skipConsent`, client URI, logo URI, scopes (min. 1). Afterwards on
`/admin/sso/[clientId]`: access mode OPEN/RESTRICTED, permission namespace, permission codes, rotate secret,
disable. Name and logo are what the consent screen shows. The wizard does **not** set
`tokenEndpointAuthMethod` (stored null = `client_secret_basic`, but post also works, see 3), `requirePKCE`
(stays required), `enableEndSession` or `subjectType`.

**Redirect URI matching**: exact string match; the only relaxation is the port on loopback hosts
(`PLUGIN/authorize-riRRCSbC.mjs:5427-5447`). Rules at save time: absolute URL, no fragment, https except for
`localhost` / `127.0.0.1` / `[::1]` (`apps/web/app/[locale]/admin/sso/redirectUris.ts:24-41`). So
`http://localhost:3000/...` is allowed.

**Allowed scopes**: a client may only request scopes stored on it; anything else fails the whole authorize with
`invalid_scope` (`PLUGIN/authorize-riRRCSbC.mjs:5556-5563`).

**Existing career client**: clients live only in the database (`oauthClient` table), so the repo cannot show
them. **Per the VTK maintainer, a production client for Career already exists on vtk.be** (prod only, none on
dev), with scopes `openid`, `profile`, `email`, `entitlements`, `vtk:study_programme`, `vtk:study_year` and
`vtk:student_number`. The exact stored scope strings could not be checked from here; they must be spelled as in
the registry (`vtk:study_programme`, singular, double m; `scopes.ts:82`), otherwise requesting them fails with
`invalid_scope`. A design note says "Career en cudi hebben geen testomgeving"
(`docs/design-decisions.md:4975-4979`), consistent with there being no dev client yet.

Consequences of that scope set for Career:
- Career may request any **subset** of those scopes; requesting one not on the list fails the whole flow.
- If Career requests `entitlements`, **the access token lives 10 minutes instead of 1 hour**
  (`auth.ts:109-120`), and userinfo returns `permissions` (the Career-defined codes this member holds). Only
  request it if Career uses those codes (e.g. for `career.vtk.be/admin`).
- `offline_access` is not on the list, so no refresh tokens.
- Get the `client_id` and redirect URI from `/admin/sso` on vtk.be and check that
  `https://career.vtk.be/api/auth/oauth/callback` is registered exactly.

### Step by step: production client (on https://vtk.be), for reference / re-creation

1. Sign in on `https://vtk.be` with an account holding `oauth.client.edit`, open `/admin/sso/nieuw`.
2. Name: `VTK Career`. Logo URI and client URI `https://career.vtk.be` (optional, shown on consent).
3. Type: `web` (confidential, gets a secret).
4. Redirect URI: `https://career.vtk.be/api/auth/oauth/callback` (exactly this string).
5. Scopes: tick `openid`, `profile`, `email`, `vtk:study_programme`, `vtk:study_year`, `vtk:student_number`.
   Untick `entitlements` (pre-selected) unless Career wants per-app permissions via VTK roles; untick nothing
   else you will request. Add `offline_access` only if you need refresh tokens.
6. Decide `skipConsent` (see 4). Recommended: off, and handle `consent_required` / re-request granted scopes.
7. Save. Copy the client secret from the modal: it is shown **once** (`packages/auth/src/server/sso.ts:117-121`,
   `apps/web/app/[locale]/admin/sso/SecretOnceModal.tsx`). Secrets start with `vtk_cs_` (`auth.ts:179`).
8. Leave access mode OPEN (every active member can log in). Use RESTRICTED only to limit to a role.
9. Test at `/admin/sso/test` (`docs/sso.md:240`, `:501-505`) or with `curl` against the discovery document.
10. Career config: issuer `https://vtk.be/api/auth/better`, PKCE S256, `client_secret_basic`.

### Dev client (on https://dev.vtk.be), does not exist yet

Same steps on `https://dev.vtk.be/admin/sso/nieuw`, with redirect URIs
`https://dev.career.vtk.be/api/auth/oauth/callback` and `http://localhost:3000/api/auth/oauth/callback`
(both allowed; one client can hold several URIs). Issuer `https://dev.vtk.be/api/auth/better`. Dev and prod are
separate databases, so the `client_id`s differ.

---

## 6. Migration from LITUS

NOT FOUND. There is no user or account migration from LITUS in this repo. Searched for `litus` (case-insensitive,
whole repo excluding `node_modules`): hits are only page content import (`scripts/import-pages.ts`,
`scripts/review-litus-pages.html`), the door agent, praesidium history, and a logistics layout note. No script
imports LITUS usernames, emails or r-numbers into `User`. The old site still runs at `old.vtk.be`
(`apps/web/proxy.ts:201-214`).

What the code does show about how accounts come to exist here:
- Most students get an account on first KU Leuven login (self-provisioning, `auth.ts:207-220`), with email =
  KU Leuven address and r-number from KU Leuven.
- Admin-created accounts and a CSV bulk import (`email,name,password,groupCode,role,year,rNumber`,
  `apps/web/app/actions/users-groups.ts:430-457`); e.g. for praesidium.
- Self-registration with email and password for people without KU Leuven login (`schema.prisma:679-687`).
- There is no "username" concept: nothing from LITUS usernames carries over. `preferred_username` is derived
  from the email.

**Can one person have two accounts?** Yes, the code allows it:
- A self-registered or admin-created account on a private address **without** an r-number, followed by a KU
  Leuven login: KU Leuven linking only matches on an existing KU Leuven account, then on r-number, then on exact
  email (`packages/auth/src/logins/kul-link.ts:1-25`, `:45-69`). No match means a new account.
- A matching email account whose `emailVerified` is false is not linked (`kul-link.ts:21-24`).
- The r-number uniqueness is case-sensitive (see 2).
The r-number path exists precisely to prevent the most common duplicate (`kul-link.ts:45-55`). There is no merge
tool. For Career: match on `sub` first once you have it; `vtk:student_number` (lowercased) is the best
cross-system key for students coming from LITUS.

---

## 7. Testing

**Local run** (`AGENTS.md`, "Local setup"): `make up && make db && make dev`. Postgres on `127.0.0.1:5433`, MinIO
on 9000. Web app on `http://localhost:3000`, issuer `http://localhost:3000/api/auth/better`
(`.env.example:175`). Discovery: `curl -s http://localhost:3000/api/auth/better/.well-known/openid-configuration`
(`docs/sso.md:519-520`). Create a client at `http://localhost:3000/admin/sso/nieuw` with redirect
`http://localhost:<career-port>/api/auth/oauth/callback`. Note Career also defaults to port 3000; run one of them
on another port (the loopback port relaxation in 5 helps). Local dev disables the onboarding and study gates
(`proxy.ts:106-107`, `:122-124`).

KU Leuven login locally only works with `KUL_OIDC_*` env vars, which are secrets delivered by ICTS
(`packages/auth/src/logins/kul.ts:19-25`, `.env.example:230-231`). Without them, email + password login works.

**Seed users** (`packages/db/prisma/seed.ts:859-981`): ten prototype users `praeses@`, `vice@`, `career@`,
`onderwijs@`, `theokot@`, `logistiek@`, `international@`, `sport@`, `cultuur@`, `it@vtk.prototype`, password
from `SEED_PROTOTYPE_PASSWORD` with a local fallback at `seed.ts:860`. All have `studyYears: ["MASTER_1"]`,
`studyProgrammes: ["COMPUTER_SCIENCE"]`, the current confirmed study year, and are onboarded. Optional super
admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (`seed.ts:1596-1626`), same study data.
- **No seed user has an r-number.**
- **No seed user has `notAtFaculty: true`.**
- To test those, edit a user: r-number via `/admin/gebruikers` (admin) or `/account`; `not_at_faculty` via the
  member's own `/account` study section.

**Existing test client**: `vtk-phase1-smoketest` exists on the dev database on purpose (`docs/sso.md:476-477`);
its secret is in that doc, not repeated here. Better to register your own.

**Staging**: `https://dev.vtk.be` is the dev deployment (`.github/workflows/deploy-dev.yml:200`), usable as the
issuer for `dev.career.vtk.be`. It runs with real KU Leuven login (ICTS registered `dev.vtk.be`,
`docs/authentication.md:362`, `:372`). Whether external teams get accounts there: NOT FOUND in code.

---

## 8. Anything else

- **Rate limits** (per client IP, per 60 s; `auth.ts:310-339`): `/oauth2/token`, `/oauth2/authorize`,
  `/oauth2/userinfo`, `/oauth2/introspect` 2000; `/oauth2/revoke` 600; `/oauth2/register` 5 (plugin default).
  Your server's token and userinfo calls all count against one IP. A 429 shows up in the client's logs, not
  VTK's (`docs/sso.md:358-382`).
- **Headers**: token endpoint takes `application/x-www-form-urlencoded`; userinfo takes a Bearer token. No other
  required headers found.
- **CORS**: no CORS configuration for the OAuth routes found (searched `apps/web/proxy.ts`, `next.config.ts`,
  `packages/auth`). Do the token/userinfo calls server-side. `trustedOrigins` (`auth.ts:51-53`) only governs
  better-auth's own origin checks.
- **Scope validation is strict**: requesting a scope the client row does not hold fails the whole flow with
  `invalid_scope` (see 5). Add a scope in the admin before you start requesting it.
- **Access gate**: if someone later sets the client to RESTRICTED, members without `<namespace>.access` land on
  `/inloggen/geen-toegang` and never reach your callback (`docs/sso.md:113-128`).
- **Known gaps in VTK's OIDC** (`docs/sso.md:453-477`): pre-ticked sensitive scopes on consent (may change to
  unticked, GDPR); `prompt=none` returns `interaction_required` instead of `access_denied` for blocked users;
  `phone` scope returns nothing; onboarding mid-flow loses the OAuth query; old clients may hold removed scopes.
- **Access tokens are not revocable before expiry**; "revoke tokens" only kills refresh tokens
  (`docs/sso.md:301-304`).
- **Planned changes**: none found for claim names or enums. The enums have grown before (e.g.
  `MOBILITY_SUPPLY_CHAIN`, comment at `schema.prisma:461-462`), so treat unknown lowercase values gracefully
  rather than rejecting the login.
- **Email caveat**: matching accounts on `email` is what VTK recommends (`docs/sso.md:244-245`), but `email` is
  not always a KU Leuven address and an admin can change it (see 2). Prefer `sub`.

---

## Assumptions that are wrong

1. **Discovery location** is only right if your configured issuer includes the path. The issuer is
   `https://vtk.be/api/auth/better`, so discovery is
   `https://vtk.be/api/auth/better/.well-known/openid-configuration`, not `/api/auth/.well-known/...` and not the
   host root.
2. **"A claim with no value is absent, never empty"**: wrong for the arrays. `vtk:study_programmes` and
   `vtk:study_years` are present as `[]` when empty. Booleans `vtk:not_at_faculty`, `vtk:onboarded` and
   `email_verified` are always present (`false` rather than absent). (`null` and `""` are indeed never emitted.)
3. **"`vtk:not_at_faculty: true` implies an empty `vtk:study_programmes`"**: wrong. The two are independent
   inputs; a member can tick programmes and "not at the faculty" together. It is also self-declared, not the
   authoritative KU Leuven faculty flag (which is not released).
4. **"The ID token carries only standard `profile` + `email` claims"**: essentially right (no `vtk:*` in the ID
   token), with nuances: it may also carry `picture` and `locale`, and `given_name`/`family_name` are absent from
   the ID token when the member has no first/last name, while userinfo still returns them (derived from `name`).
5. **Declining a scope**: declining `vtk:student_number` does not fail the flow, but it makes every later
   authorize that requests that scope show the consent screen again (or `consent_required` with
   `prompt=none`). Silent 24 h re-login breaks for those members unless you adapt (see 4).
6. **`vtk:student_number` format**: lowercase `r` + 7 digits is only guaranteed for KU Leuven and self-entered
   values; admin-entered and CSV-imported values are neither lowercased nor validated. Lowercase before matching.
7. **"`email` is the KU Leuven address"** (implied by the matching strategy): not guaranteed. It can be a private
   address (self-registration, admin-created accounts, or linking via r-number to a pre-existing account), and
   an admin can change it.
8. **Matching on username**: `preferred_username` is just the local part of `email`; no LITUS username exists or
   was migrated here. It will not match LITUS usernames except by coincidence.
9. **Signing algorithm** (if the client assumes RS256): ID tokens are signed with EdDSA.
10. **Scopes requested**: the six scopes the client requests are all granted to the prod client, but that client
    also holds `entitlements`. Not requesting it is fine; requesting it shortens access tokens to 10 minutes.
11. **Client auth** is not wrong (`client_secret_basic` works, and is the stored default), but `client_secret_post`
    also works.
