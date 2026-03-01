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
export async function storeOAuthState(
  state: string,
  redirectTo: string = "/",
  opts?: { domain?: string; maxAge?: number }
) {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const maxAge = opts?.maxAge ?? 1800; // 30 minutes
  const domainOpt = opts?.domain ? { domain: opts.domain } : {};

  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge,
    ...domainOpt,
  });

  cookieStore.set("oauth_redirect_to", redirectTo, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge,
    ...domainOpt,
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
    // Return redirectTo even when invalid so it can be preserved in error cases
    return { valid: false, redirectTo };
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
  const envUrlCandidates = [
    process.env.NEXT_PUBLIC_FORM_DOMAIN,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXTAUTH_URL,
    // Legacy / server-only override (kept for backwards compatibility)
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  for (const candidate of envUrlCandidates) {
    try {
      const url = new URL(candidate);
      return url.origin;
    } catch {
      // Ignore invalid URL and continue.
    }
  }

  // Some platforms expose the hostname without protocol (e.g. VERCEL_URL)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    try {
      const url = new URL(`https://${vercelUrl.replace(/^https?:\/\//, "")}`);
      return url.origin;
    } catch {
      // Ignore invalid URL and continue.
    }
  }

  const forwarded = request.headers.get("forwarded");
  const forwardedHostHeader = request.headers.get("x-forwarded-host");
  const forwardedProtoHeader = request.headers.get("x-forwarded-proto");
  const hostHeader = request.headers.get("host");

  const parseForwarded = (
    header: string | null
  ): { host?: string; proto?: string } => {
    if (!header) return {};
    // Basic parsing for: Forwarded: proto=https;host=example.com
    // Also handles multiple entries separated by comma: keep first.
    const first = header.split(",")[0]?.trim() ?? "";
    const parts = first.split(";").map((p) => p.trim());
    const out: { host?: string; proto?: string } = {};
    for (const p of parts) {
      const [kRaw, vRaw] = p.split("=", 2);
      const k = (kRaw ?? "").trim().toLowerCase();
      const v = (vRaw ?? "").trim().replace(/^"|"$/g, "");
      if (!k || !v) continue;
      if (k === "host") out.host = v;
      if (k === "proto") out.proto = v;
    }
    return out;
  };

  const forwardedParsed = parseForwarded(forwarded);
  const forwardedHost =
    forwardedHostHeader?.split(",")[0]?.trim() || forwardedParsed.host;
  const forwardedProto =
    forwardedProtoHeader?.split(",")[0]?.trim() || forwardedParsed.proto;
  const host = hostHeader?.split(",")[0]?.trim();

  // Prefer forwarded host if available (most reliable in proxy setups)
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



