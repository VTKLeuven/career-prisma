import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, STUDENT_SESSION_COOKIE } from "@/lib/auth-session";
import { SSO_HINT_COOKIE } from "@/lib/vtk-sso";
import StudentLoginClient from "./client";

export const dynamic = "force-dynamic";

/**
 * The single funnel for "you need to be signed in" — every `/student-login`
 * link in the app lands here, which is why the silent re-authentication lives
 * at this one place rather than in a middleware this project deliberately does
 * not have.
 *
 * Student sessions last 24 hours. The SSO's own session lasts much longer, so
 * a student whose session has expired is sent straight back through the SSO
 * and returns already signed in, without seeing this page. The hint cookie is
 * what tells the two cases apart: without it we cannot know whether this
 * browser belongs to an SSO student or an external one, and bouncing everybody
 * would take the email-and-password form away from the people who need it.
 *
 * Logging out clears the hint, so signing out does not sign you straight back in.
 */
export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.redirectTo;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  const redirectTo =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/";

  const cookieStore = await cookies();
  const hasSession = Boolean(
    verifySessionToken(cookieStore.get(STUDENT_SESSION_COOKIE)?.value, "student")
  );

  // A live session means they never needed this page.
  if (hasSession) redirect(redirectTo);

  // `?sso=0` is the escape hatch: it forces the form for a student whose
  // browser carries the hint but who needs the email-and-password route —
  // after a failed SSO login, say. Without it the bounce above would be a
  // one-way door, and the error page at `/auth/callback` links back here.
  const forceForm = (Array.isArray(params.sso) ? params.sso[0] : params.sso) === "0";

  if (!forceForm && cookieStore.get(SSO_HINT_COOKIE)?.value) {
    redirect(`/api/auth/oauth/initiate?redirect_to=${encodeURIComponent(redirectTo)}`);
  }

  return <StudentLoginClient />;
}
