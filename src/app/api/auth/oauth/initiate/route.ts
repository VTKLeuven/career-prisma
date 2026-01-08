// app/api/auth/oauth/initiate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateState, storeOAuthState, buildAuthorizationUrl, getRequestOrigin } from "@/lib/oauth";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const redirectTo = searchParams.get("redirect_to") || "/";

    // Get OAuth configuration from environment variables
    const authorizeUrl = process.env.LITUS_OAUTH_AUTHORIZE || process.env.OAUTH_AUTHORIZE_URL;
    const clientId = process.env.LITUS_API_KEY || process.env.OAUTH_CLIENT_ID;
    const origin = getRequestOrigin(request);
    const callbackUrl = process.env.OAUTH_CALLBACK_URL || `${origin}/api/auth/oauth/callback`;
    const scopes = process.env.OAUTH_SCOPES?.split(",").map((s) => s.trim()) || [];

    if (!authorizeUrl || !clientId) {
      console.error("Missing OAuth configuration:", { authorizeUrl: !!authorizeUrl, clientId: !!clientId });
      return NextResponse.json(
        { error: "OAuth is not configured. Please set LITUS_OAUTH_AUTHORIZE and LITUS_API_KEY." },
        { status: 500 }
      );
    }

    // Generate state for CSRF protection
    const state = generateState();

    // Store state and redirect URL in cookies
    // IMPORTANT: on production the OAuth callback may land on a different subdomain
    // (e.g. apex vs www). Use a shared cookie domain so `oauth_state` is available.
    const rawHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const host = rawHost.split(",")[0]?.trim().toLowerCase() ?? "";
    const hostNoPort = host.split(":")[0] ?? host;
    const cookieDomain =
      process.env.NODE_ENV === "production" && hostNoPort.endsWith("career.vtk.be")
        ? ".career.vtk.be"
        : undefined;

    await storeOAuthState(state, redirectTo, { domain: cookieDomain, maxAge: 1800 });

    // Build authorization URL
    const authUrl = buildAuthorizationUrl(authorizeUrl, clientId, callbackUrl, state, scopes);

    // Redirect to OAuth provider
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}

