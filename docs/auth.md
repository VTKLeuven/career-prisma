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

## Authorization

There is **no middleware**. Each page, server action and route handler checks
for itself:

- `requireAdminUser()` in `src/lib/auth-server.ts` — throws on non-admin.
- `hasCompanyPageAccess()` in `src/lib/utils/company-access.ts` — company
  scoping.

**When you add an admin page, action, or API route, add the check.** Nothing
upstream will do it for you.
