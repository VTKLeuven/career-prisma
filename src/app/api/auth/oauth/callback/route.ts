// app/api/auth/oauth/callback/route.ts — finishes the VTK SSO login flow.
//
// Exchanges the code, reads the claims, mirrors them onto the students row and
// mints the student session. Claims are refreshed here and nowhere else: we
// ask for no `offline_access`, so a login flow is the only moment the app ever
// hears from the SSO. That is also why student sessions last 24 hours — see
// STUDENT_SESSION_MAX_AGE in `lib/vtk-sso.ts`.
import { NextRequest, NextResponse } from "next/server";
import {
  SSO_HINT_COOKIE,
  SSO_HINT_DURATION,
  STUDENT_SESSION_MAX_AGE,
  autoReloginFailedPath,
  clearFlowState,
  decodeIdToken,
  discover,
  exchangeCode,
  fetchUserInfo,
  flowCookieDomain,
  getCallbackUrl,
  hintCookieValue,
  getFrontendUrl,
  getSsoConfig,
  readFlowState,
  statesMatch,
  validateIdTokenClaims,
  type Claims,
} from "@/lib/vtk-sso";
import { toSsoProfile, unmappedClaims } from "@/lib/vtk-sso-claims";
import { upsertStudentFromSso } from "@/lib/repos/students";
import { studyEditability } from "@/lib/study-options";
import { logSystemEvent, type SystemLogLevel } from "@/lib/repos/system-logs";
import {
  createSessionToken,
  expiredSessionCookieOptions,
  sessionCookieOptions,
  STUDENT_SESSION_COOKIE,
} from "@/lib/auth-session";

export const dynamic = "force-dynamic";

/**
 * Failures a student causes by using the flow normally — declining consent,
 * or finishing a login in a tab whose flow cookies had already expired. Worth
 * seeing, not worth alarming anyone over.
 */
const EXPECTED_FAILURES: Record<string, SystemLogLevel> = {
  access_denied: "info",
  invalid_state: "warn",
};

/**
 * Logs the failure for the IT admins, then sends the browser to the shared
 * error/landing page with a reason attached.
 *
 * A silent flow — the automatic re-login nobody clicked for — lands on the
 * login form instead, with `sso=0` so it cannot bounce straight back into the
 * SSO, and loses its hint so later page loads stop trying until the student
 * signs in by hand. `invalid_state` keeps the hint: it says nothing about the
 * student's account, and two tabs re-logging in at once cause it.
 */
async function fail(
  request: NextRequest,
  code: string,
  description: string | undefined,
  { redirectTo, silent }: { redirectTo: string; silent: boolean },
  details?: Record<string, unknown>
): Promise<NextResponse> {
  await logSystemEvent({
    source: "vtk_sso",
    level: EXPECTED_FAILURES[code] ?? "error",
    event: "login_failed",
    message: description ? `${code}: ${description}` : code,
    details: { code, silent, ...details },
  });

  if (silent) {
    const response = NextResponse.redirect(
      new URL(autoReloginFailedPath(code, redirectTo), getFrontendUrl(request))
    );
    if (code !== "invalid_state") {
      response.cookies.set(SSO_HINT_COOKIE, "", {
        ...expiredSessionCookieOptions(request),
        domain: flowCookieDomain(request),
      });
    }
    return response;
  }

  const url = new URL("/auth/callback", getFrontendUrl(request));
  url.searchParams.set("error", code);
  if (description) url.searchParams.set("error_description", description);
  url.searchParams.set("redirect_to", redirectTo);
  return NextResponse.redirect(url.toString());
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // Read the flow cookies before anything can clear them.
  const flow = await readFlowState();
  // Checked again here, not just in `initiate`: the cookie is shared across
  // `.career.vtk.be`, and this value now goes straight into a redirect.
  const redirectTo =
    flow.redirectTo?.startsWith("/") && !flow.redirectTo.startsWith("//")
      ? flow.redirectTo
      : "/";
  const target = { redirectTo, silent: flow.silent === true };

  try {
    const providerError = params.get("error");
    if (providerError) {
      await clearFlowState();
      return fail(
        request,
        providerError,
        params.get("error_description") ?? undefined,
        target,
        { from: "provider" }
      );
    }

    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      await clearFlowState();
      return fail(request, "missing_parameters", "Missing code or state", target);
    }

    const config = getSsoConfig();
    if ("error" in config) {
      return fail(request, "configuration_error", config.error, target);
    }

    if (!statesMatch(state, flow.state) || !flow.verifier || !flow.nonce) {
      await clearFlowState();
      return fail(
        request,
        "invalid_state",
        "The login attempt expired or did not start here. Please try again.",
        target
      );
    }

    // Single-use: whatever happens from here, this flow's state is spent.
    const nonce = flow.nonce;
    const verifier = flow.verifier;
    await clearFlowState();

    const endpoints = await discover(config.issuer);
    const tokens = await exchangeCode(
      endpoints,
      config,
      code,
      getCallbackUrl(request),
      verifier
    );

    // The ID token carries only the `profile` and `email` claims. Everything
    // under `vtk:` — study programme, year, r-number — lives in userinfo, so
    // the userinfo call is required, not an optimisation.
    let claims: Claims = {};
    if (tokens.id_token) {
      const idClaims = decodeIdToken(tokens.id_token);
      if (!idClaims) {
        return fail(request, "invalid_id_token", "Could not read the ID token", target);
      }
      const problem = validateIdTokenClaims(idClaims, {
        issuer: endpoints.issuer,
        clientId: config.clientId,
        nonce,
      });
      if (problem) {
        return fail(request, "invalid_id_token", problem, target);
      }
      claims = idClaims;
    }

    // Userinfo wins on conflict: it is the fuller and fresher of the two.
    claims = { ...claims, ...(await fetchUserInfo(endpoints, tokens.access_token)) };

    const unmapped = unmappedClaims(claims);
    if (unmapped.length) {
      // Not an error — but if a claim we rely on gets renamed, this line is
      // what turns "the column silently stopped updating" into a log entry.
      await logSystemEvent({
        source: "vtk_sso",
        level: "warn",
        event: "unmapped_claims",
        message: `Unmapped claims received: ${unmapped.join(", ")}`,
        details: { claims: unmapped },
      });
    }

    const profile = toSsoProfile(claims);
    if ("error" in profile) {
      // Claim names only, never values: this is what tells a missing scope
      // apart from a renamed claim.
      return fail(request, "missing_claims", profile.error, target, {
        receivedClaims: Object.keys(claims).sort(),
      });
    }

    // Members outside FIRW are signed in like anyone else — the SSO simply has
    // no programme on file for them, and they fill it in during onboarding.
    const upserted = await upsertStudentFromSso({
      ...profile,
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    });

    if (!upserted) {
      return fail(
        request,
        "student_upsert_failed",
        "Could not create or update your student account",
        target
      );
    }

    const { student, matchedBy, emailConflictWith } = upserted;

    if (emailConflictWith) {
      await logSystemEvent({
        source: "vtk_sso",
        level: "warn",
        event: "email_conflict",
        message: `Preferred address ${profile.email} already belongs to student ${emailConflictWith}; ${student.email} kept its address`,
        studentId: student.id,
        details: { preferredEmail: profile.email, otherStudentId: emailConflictWith },
      });
    }
    // A programme that is the student's to choose (vtk.be sent none, or they
    // are not at the faculty) is answered by the masters/faculties they ticked
    // on Career; a locked one always has vtk.be's programmes behind it.
    const needsStudyOnboarding =
      (studyEditability(student).programmes &&
        student.study_master_ids.length === 0 &&
        student.study_faculty_ids.length === 0) ||
      student.study_years.length === 0;

    await logSystemEvent({
      source: "vtk_sso",
      level: "info",
      event: "login_succeeded",
      message:
        matchedBy === "created"
          ? `New student account created for ${student.email}`
          : `Signed in ${student.email} (matched on ${matchedBy})`,
      studentId: student.id,
      details: {
        matchedBy,
        needsStudyOnboarding,
        notAtFaculty: profile.notAtFaculty ?? null,
        grantedScopes: tokens.scope ?? null,
      },
    });

    // Straight to where the student was going. `/auth/callback` is only the
    // error page now: a client-side hop through it on success cost a full page
    // load before the real destination even started loading.
    const destination = new URL(
      needsStudyOnboarding
        ? `/student/study-details?redirectTo=${encodeURIComponent(redirectTo)}`
        : redirectTo,
      getFrontendUrl(request)
    );

    const response = NextResponse.redirect(destination.toString());

    response.cookies.set(
      STUDENT_SESSION_COOKIE,
      createSessionToken(student.id, "student", STUDENT_SESSION_MAX_AGE),
      sessionCookieOptions(request, STUDENT_SESSION_MAX_AGE)
    );

    // Outlives the session on purpose (30 days against 24 hours): it is what
    // lets a page load or `/student-login` bounce an expired session back
    // through the SSO without showing a form. Set again on every login, so it
    // only runs out after a month without one. It remembers the granted
    // scopes, so that bounce stays silent for a student who declined one (see
    // `hintCookieValue`).
    response.cookies.set(SSO_HINT_COOKIE, hintCookieValue(tokens.scope), {
      ...sessionCookieOptions(request, SSO_HINT_DURATION),
      domain: flowCookieDomain(request),
    });

    return response;
  } catch (error) {
    await clearFlowState().catch(() => {});
    return fail(
      request,
      "callback_error",
      error instanceof Error ? error.message : "Unknown error",
      target,
      { stack: error instanceof Error ? error.stack?.split("\n").slice(0, 6) : undefined }
    );
  }
}
