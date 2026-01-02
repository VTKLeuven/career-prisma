// lib/oauth.ts
import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

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



