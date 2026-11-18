// app/api/auth/oauth/initiate/route.ts — starts the VTK SSO login flow.
//
// The path still says "oauth" because every "Login with your VTK account"
// link in the app points at it; the provider behind it changed from LITUS to
// the new site's OIDC endpoint, not the entry point.
import { NextRequest, NextResponse } from "next/server";
import {
  SSO_ATTEMPT_COOKIE,
  SSO_ATTEMPT_DURATION,
  SSO_HINT_COOKIE,
  autoReloginFailedPath,
  buildAuthorizationUrl,
  codeChallengeFor,
  discover,
  flowCookieDomain,
  generateCodeVerifier,
  generateState,
  getCallbackUrl,
  getFrontendUrl,
  getSsoConfig,
  scopesForSilentLogin,
  storeFlowState,
} from "@/lib/vtk-sso";
import { logSystemEvent } from "@/lib/repos/system-logs";
import { expiredSessionCookieOptions, sessionCookieOptions } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

/**
 * A silent flow nobody asked for must not end on a JSON error: send the
 * student to the login form with a reason, and drop the hint so the next page
 * load does not try again. Signing in by hand sets it again.
 */
function silentFailure(request: NextRequest, redirectTo: string): NextResponse {
  const response = NextResponse.redirect(
    new URL(autoReloginFailedPath("initiate_failed", redirectTo), getFrontendUrl(request))
  );
  response.cookies.set(SSO_HINT_COOKIE, "", {
    ...expiredSessionCookieOptions(request),
    domain: flowCookieDomain(request),
  });
  return response;
}

export async function GET(request: NextRequest) {
  // Only same-site paths, so `?redirect_to=https://evil.example` cannot turn
  // the login flow into an open redirect.
  const requested = request.nextUrl.searchParams.get("redirect_to") || "/";
  const redirectTo =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  // `silent=1` is the automatic re-login after the 24-hour session ran out —
  // from a page load (the `(site)` layout) or from `/student-login`.
  const silent = request.nextUrl.searchParams.get("silent") === "1";

  try {
    const config = getSsoConfig();
    if ("error" in config) {
      await logSystemEvent({
        source: "vtk_sso",
        level: "error",
        event: "initiate_failed",
        message: config.error,
      });
      if (silent) return silentFailure(request, redirectTo);
      return NextResponse.json({ error: config.error }, { status: 500 });
    }

    const endpoints = await discover(config.issuer);

    const state = generateState();
    const nonce = generateState();
    const verifier = generateCodeVerifier();

    await storeFlowState(
      { state, nonce, verifier, redirectTo, silent },
      flowCookieDomain(request)
    );

    // A silent flow asks only for what the student granted last time, so
    // vtk.be skips its consent screen. A login the student starts themselves
    // asks for everything, which is their chance to grant a scope they
    // declined before.
    const scopes = silent
      ? scopesForSilentLogin(config, request.cookies.get(SSO_HINT_COOKIE)?.value)
      : config.scopes;

    const response = NextResponse.redirect(
      buildAuthorizationUrl(
        endpoints,
        config,
        getCallbackUrl(request),
        { state, nonce, challenge: codeChallengeFor(verifier) },
        scopes
      )
    );

    // The loop guard: no other automatic attempt starts for a few minutes,
    // whatever this one ends in. See SSO_ATTEMPT_COOKIE.
    if (silent) {
      response.cookies.set(SSO_ATTEMPT_COOKIE, "1", {
        ...sessionCookieOptions(request, SSO_ATTEMPT_DURATION),
        domain: flowCookieDomain(request),
      });
    }

    return response;
  } catch (error) {
    // Almost always discovery: the SSO is down or VTK_SSO_ISSUER is wrong.
    await logSystemEvent({
      source: "vtk_sso",
      level: "error",
      event: "initiate_failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    if (silent) return silentFailure(request, redirectTo);
    return NextResponse.json(
      { error: "Failed to start the VTK login flow" },
      { status: 500 }
    );
  }
}
