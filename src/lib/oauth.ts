// lib/oauth.ts
import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { NextRequest } from "next/server";

/**
 * Generate a secure random state string for OAuth
 */
export function generateState(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Store OAuth state in cookie
 */
export async function storeOAuthState(state: string, redirectTo: string = "/") {
  const cookieStore = await cookies();
  
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  cookieStore.set("oauth_redirect_to", redirectTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
}

/**
 * Verify and retrieve OAuth state from cookie
 */
export async function verifyOAuthState(state: string): Promise<{
  valid: boolean;
  redirectTo?: string;
}> {
  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  const redirectTo = cookieStore.get("oauth_redirect_to")?.value || "/";

  if (!storedState || storedState !== state) {
    return { valid: false };
  }

  // Clear the state cookie after verification
  cookieStore.delete("oauth_state");
  cookieStore.delete("oauth_redirect_to");

  return { valid: true, redirectTo };
}

/**
 * Get the proper origin from request headers
 * Checks X-Forwarded-Host, Host, and X-Forwarded-Proto headers
 * Falls back to environment variables or request.nextUrl.origin
 */
export function getRequestOrigin(request: NextRequest): string {
  // First, check if there's an explicit FRONTEND_URL or OAUTH_CALLBACK_URL set
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    try {
      const url = new URL(frontendUrl);
      return url.origin;
    } catch {
      // Invalid URL, continue to header-based detection
    }
  }

  // Check NEXT_PUBLIC_FORM_DOMAIN as a fallback (server URL)
  const formDomain = process.env.NEXT_PUBLIC_FORM_DOMAIN;
  if (formDomain) {
    try {
      const url = new URL(formDomain);
      return url.origin;
    } catch {
      // Invalid URL, continue to header-based detection
    }
  }

  // Check for forwarded headers (common in reverse proxy setups)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host");

  // Prefer X-Forwarded-Host if available (most reliable in proxy setups)
  const finalHost = forwardedHost || host;
  
  // Determine protocol - forwarded-proto usually doesn't include colon
  let finalProto = forwardedProto || request.nextUrl.protocol.replace(":", "");
  // Ensure protocol format is correct (http or https, no colon)
  finalProto = finalProto.replace(":", "").toLowerCase();

  if (finalHost) {
    // Don't use 0.0.0.0 or localhost-like addresses
    if (!finalHost.includes("0.0.0.0") && !finalHost.startsWith("127.0.0.1") && !finalHost.startsWith("localhost")) {
      return `${finalProto}://${finalHost}`;
    }
  }

  // Fallback to nextUrl.origin, but warn if it's 0.0.0.0
  const fallbackOrigin = request.nextUrl.origin;
  if (fallbackOrigin.includes("0.0.0.0")) {
    console.warn(
      "Warning: OAuth callback URL is using 0.0.0.0. " +
      "Set FRONTEND_URL or OAUTH_CALLBACK_URL environment variable, " +
      "or ensure your reverse proxy sets X-Forwarded-Host header."
    );
  }

  return fallbackOrigin;
}

/**
 * Build OAuth authorization URL
 */
export function buildAuthorizationUrl(
  authorizeUrl: string,
  clientId: string,
  redirectUri: string,
  state: string,
  scopes: string[] = []
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    ...(scopes.length > 0 && { scope: scopes.join(" ") }),
  });

  return `${authorizeUrl}?${params.toString()}`;
}



