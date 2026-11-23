import argon2 from "argon2";
import { NextResponse } from "next/server";
import { findUserCredentials, recordUserLogin } from "@/lib/repos/credentials";
import {
  createSessionToken,
  sessionCookieOptions,
  USER_SESSION_COOKIE,
} from "@/lib/auth-session";
import {
  clearLoginFailures,
  clientIp,
  loginRetryAfter,
  recordLoginFailure,
  tooManyAttemptsMessage,
} from "@/lib/login-throttle";
import { loggableEmail, logSystemEvent } from "@/lib/repos/system-logs";
import { ROLE_ADMINISTRATOR, ROLE_COMPANY_REP, ROLE_VTK_CAREER } from "@/lib/roles";

// Only these roles may sign in at all. Any other role -- "Student", or one
// created later -- is rejected with the same message as a bad password, which
// is why an account can look perfectly healthy in the database and still 401.
//
// Match on the id, never the name: the names do not mean what they look like.
// The *salesperson* role is the one called "VTK Career", and "Administrator" is
// the internal role that deliberately is not a salesperson.
const ALLOWED_ROLE_IDS = new Set([
  "7b128ef4-f530-47d2-8f4c-ef82518eb313", // "VTK Career"
  "d5475bf4-a77f-48de-b06c-fac199b0f631", // "Company Rep"
  "c4e63615-ed81-45d1-8145-1b88137e60cb", // "Administrator"
]);

/** For the log only; authorization above matches on the ids. */
function roleLabel(roleId: string | null): string {
  if (roleId === ROLE_VTK_CAREER) return "vtk_career";
  if (roleId === ROLE_ADMINISTRATOR) return "administrator";
  if (roleId === ROLE_COMPANY_REP) return "company_rep";
  return roleId ? "other" : "none";
}

/**
 * Why a sign-in is refused, or null when it is allowed. The response never
 * says which -- every refusal answers with the same message -- but the log
 * does, for an admin helping someone who cannot get in.
 */
async function refusalReason(
  user: Awaited<ReturnType<typeof findUserCredentials>>,
  password: string
): Promise<string | null> {
  if (!user) return "no_account";
  if (user.status !== "active") return `status_${user.status ?? "unknown"}`;
  if (!user.password) return "no_password_set";
  if (!user.role_id || !ALLOWED_ROLE_IDS.has(user.role_id)) return "role_not_allowed";
  if (!(await argon2.verify(user.password, password))) return "wrong_password";
  return null;
}

export async function POST(request: Request) {
  try {
    const { email, password, rememberMe } = await request.json();
    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const ip = clientIp(request);
    const retryAfter = loginRetryAfter("user", email, ip);
    if (retryAfter > 0) {
      return NextResponse.json(
        { error: tooManyAttemptsMessage(retryAfter) },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    const user = await findUserCredentials(email);
    const refused = await refusalReason(user, password);
    if (refused || !user) {
      const reason = refused ?? "no_account";
      recordLoginFailure("user", email, ip);
      const lockedFor = loginRetryAfter("user", email, ip);
      await logSystemEvent({
        source: "user_accounts",
        level: "warn",
        event: "login_failed",
        capped: true,
        message: `Sign-in refused for ${loggableEmail(email)}: ${reason}`,
        details: {
          email: loggableEmail(email),
          reason,
          ...(user && { userId: user.id, role: roleLabel(user.role_id) }),
          ip,
        },
      });
      // Logged once, on the failure that trips the limit, not on every 429
      // after it -- those would let anyone fill the table.
      if (lockedFor > 0) {
        await logSystemEvent({
          source: "user_accounts",
          level: "warn",
          event: "login_locked",
          message: `Too many failed sign-ins for ${loggableEmail(email)}; locked for ${Math.ceil(lockedFor / 60)} min`,
          details: { email: loggableEmail(email), ip, lockedForSeconds: lockedFor },
        });
      }
      return NextResponse.json(
        { error: "Invalid credentials or insufficient access." },
        { status: 401 },
      );
    }

    clearLoginFailures("user", email);
    const maxAge = rememberMe ? 90 * 24 * 60 * 60 : 14 * 24 * 60 * 60;
    const response = NextResponse.json({ message: "Successful login" });
    response.cookies.set(
      USER_SESSION_COOKIE,
      createSessionToken(user.id, "user", maxAge),
      sessionCookieOptions(request, maxAge),
    );
    await recordUserLogin(user.id);
    await logSystemEvent({
      source: "user_accounts",
      level: "info",
      event: "login_succeeded",
      message: `${user.email} signed in (${roleLabel(user.role_id)})`,
      details: {
        userId: user.id,
        email: user.email,
        role: roleLabel(user.role_id),
        rememberMe: Boolean(rememberMe),
      },
    });
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Unexpected error during login." },
      { status: 500 },
    );
  }
}
