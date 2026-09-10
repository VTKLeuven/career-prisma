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
  clearFlowState,
  decodeIdToken,
  discover,
  exchangeCode,
  fetchUserInfo,
  flowCookieDomain,
  getCallbackUrl,
  getFrontendUrl,
  getSsoConfig,
  readFlowState,
  statesMatch,
  validateIdTokenClaims,
  type Claims,
} from "@/lib/vtk-sso";
import { toSsoProfile, unmappedClaims } from "@/lib/vtk-sso-claims";
import { upsertStudentFromSso } from "@/lib/repos/students";
import {
  createSessionToken,
  sessionCookieOptions,
  STUDENT_SESSION_COOKIE,
} from "@/lib/auth-session";

export const dynamic = "force-dynamic";

/** Sends the browser to the shared error/landing page with a reason attached. */
function fail(
  request: NextRequest,
  code: string,
  description: string | undefined,
  redirectTo: string
): NextResponse {
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
  const redirectTo = flow.redirectTo || "/";

  try {
    const providerError = params.get("error");
    if (providerError) {
      await clearFlowState();
      console.error("[vtk-sso] Provider returned an error:", providerError);
      return fail(
        request,
        providerError,
        params.get("error_description") ?? undefined,
        redirectTo
      );
    }

    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      await clearFlowState();
      return fail(request, "missing_parameters", "Missing code or state", redirectTo);
    }

    const config = getSsoConfig();
    if ("error" in config) {
      console.error("[vtk-sso] callback:", config.error);
      return fail(request, "configuration_error", config.error, redirectTo);
    }

    if (!statesMatch(state, flow.state) || !flow.verifier || !flow.nonce) {
      await clearFlowState();
      return fail(
        request,
        "invalid_state",
        "The login attempt expired or did not start here. Please try again.",
        redirectTo
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
        return fail(request, "invalid_id_token", "Could not read the ID token", redirectTo);
      }
      const problem = validateIdTokenClaims(idClaims, {
        issuer: endpoints.issuer,
        clientId: config.clientId,
        nonce,
      });
      if (problem) {
        console.error("[vtk-sso] ID token rejected:", problem);
        return fail(request, "invalid_id_token", problem, redirectTo);
      }
      claims = idClaims;
    }

    // Userinfo wins on conflict: it is the fuller and fresher of the two.
    claims = { ...claims, ...(await fetchUserInfo(endpoints, tokens.access_token)) };

    const unmapped = unmappedClaims(claims);
    if (unmapped.length) {
      // Not an error — but if a claim we rely on gets renamed, this line is
      // what turns "the column silently stopped updating" into a log entry.
      console.info("[vtk-sso] Unmapped claims received:", unmapped.join(", "));
    }

    const profile = toSsoProfile(claims);
    if ("error" in profile) {
      console.error("[vtk-sso]", profile.error);
      return fail(request, "missing_claims", profile.error, redirectTo);
    }

    // Members outside FIRW are signed in like anyone else — the SSO simply has
    // no programme on file for them, and they fill it in during onboarding.
    const student = await upsertStudentFromSso({
      ...profile,
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    });

    if (!student) {
      return fail(
        request,
        "student_upsert_failed",
        "Could not create or update your student account",
        redirectTo
      );
    }

    const needsStudyOnboarding =
      student.study_programmes.length === 0 || student.study_years.length === 0;

    const destination = new URL("/auth/callback", getFrontendUrl(request));
    destination.searchParams.set(
      "redirect_to",
      needsStudyOnboarding
        ? `/student/study-details?redirectTo=${encodeURIComponent(redirectTo)}`
        : redirectTo
    );

    const response = NextResponse.redirect(destination.toString());

    response.cookies.set(
      STUDENT_SESSION_COOKIE,
      createSessionToken(student.id, "student", STUDENT_SESSION_MAX_AGE),
      sessionCookieOptions(request, STUDENT_SESSION_MAX_AGE)
    );

    // Outlives the session on purpose: it is what lets `/student-login` bounce
    // an expired session back through the SSO without showing a form.
    response.cookies.set(SSO_HINT_COOKIE, "1", {
      ...sessionCookieOptions(request, SSO_HINT_DURATION),
      domain: flowCookieDomain(request),
    });

    return response;
  } catch (error) {
    console.error("[vtk-sso] Callback failed:", error);
    await clearFlowState().catch(() => {});
    return fail(
      request,
      "callback_error",
      error instanceof Error ? error.message : "Unknown error",
      redirectTo
    );
  }
}
