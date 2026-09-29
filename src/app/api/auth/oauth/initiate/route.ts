// app/api/auth/oauth/initiate/route.ts — starts the VTK SSO login flow.
//
// The path still says "oauth" because every "Login with your VTK account"
// link in the app points at it; the provider behind it changed from LITUS to
// the new site's OIDC endpoint, not the entry point.
import { NextRequest, NextResponse } from "next/server";
import {
  SSO_HINT_COOKIE,
  buildAuthorizationUrl,
  codeChallengeFor,
  discover,
  flowCookieDomain,
  generateCodeVerifier,
  generateState,
  getCallbackUrl,
  getSsoConfig,
  scopesForSilentLogin,
  storeFlowState,
} from "@/lib/vtk-sso";
import { logSystemEvent } from "@/lib/repos/system-logs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Only same-site paths, so `?redirect_to=https://evil.example` cannot turn
    // the login flow into an open redirect.
    const requested = request.nextUrl.searchParams.get("redirect_to") || "/";
    const redirectTo =
      requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

    const config = getSsoConfig();
    if ("error" in config) {
      await logSystemEvent({
        source: "vtk_sso",
        level: "error",
        event: "initiate_failed",
        message: config.error,
      });
      return NextResponse.json({ error: config.error }, { status: 500 });
    }

    const endpoints = await discover(config.issuer);

    const state = generateState();
    const nonce = generateState();
    const verifier = generateCodeVerifier();

    await storeFlowState(
      { state, nonce, verifier, redirectTo },
      flowCookieDomain(request)
    );

    // `silent=1` is the bounce from `/student-login` after the 24-hour session
    // ran out: ask only for what the student granted last time, so vtk.be
    // skips its consent screen. A login the student starts themselves asks for
    // everything, which is their chance to grant a scope they declined before.
    const silent = request.nextUrl.searchParams.get("silent") === "1";
    const scopes = silent
      ? scopesForSilentLogin(config, request.cookies.get(SSO_HINT_COOKIE)?.value)
      : config.scopes;

    return NextResponse.redirect(
      buildAuthorizationUrl(
        endpoints,
        config,
        getCallbackUrl(request),
        { state, nonce, challenge: codeChallengeFor(verifier) },
        scopes
      )
    );
  } catch (error) {
    // Almost always discovery: the SSO is down or VTK_SSO_ISSUER is wrong.
    await logSystemEvent({
      source: "vtk_sso",
      level: "error",
      event: "initiate_failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to start the VTK login flow" },
      { status: 500 }
    );
  }
}
