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
| Students via VTK | LITUS OAuth | hand-rolled in `src/lib/oauth.ts`, callback at `/api/auth/oauth/callback` |
| KU Leuven | `/kuleuven-login` | NextAuth OIDC provider defined in `src/auth.ts` |

Invitations (`src/lib/invite-token.ts`, `/accept-invite`) and password resets
(`src/lib/password-reset.ts`) both use hashed, timestamped single-use tokens.

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

Two places encode this, and they must stay in sync:

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
