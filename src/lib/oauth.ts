// lib/oauth.ts - OAuth utilities for LITUS authentication

import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_REDIRECT_COOKIE = "oauth_redirect_to";
const OAUTH_STATE_DURATION = 60 * 10; // 10 minutes

export function generateState(): string {
  return crypto.randomBytes(32).toString("hex");
}

interface StoreStateOptions {
  domain?: string;
  maxAge?: number;
}

export async function storeOAuthState(
  state: string,
  redirectTo?: string,
  options: StoreStateOptions = {}
): Promise<void> {
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: options.maxAge ?? OAUTH_STATE_DURATION,
    path: "/",
    domain: options.domain,
  };

  cookieStore.set(OAUTH_STATE_COOKIE, state, cookieOptions);
  if (redirectTo) {
    cookieStore.set(OAUTH_REDIRECT_COOKIE, redirectTo, cookieOptions);
  }
}

export async function verifyOAuthState(state: string): Promise<boolean> {
  const cookieStore = await cookies();
  const storedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  if (!storedState || storedState !== state) {
    return false;
  }

  cookieStore.delete(OAUTH_STATE_COOKIE);
  cookieStore.delete(OAUTH_REDIRECT_COOKIE);
  return true;
}

/**
 * Get the proper origin from request headers.
 * Checks Forwarded/X-Forwarded-* headers and falls back to request.nextUrl.origin.
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

  const parseForwarded = (header: string | null): { host?: string; proto?: string } => {
    if (!header) return {};
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
  const forwardedHost = forwardedHostHeader?.split(",")[0]?.trim() || forwardedParsed.host;
  const forwardedProto = forwardedProtoHeader?.split(",")[0]?.trim() || forwardedParsed.proto;
  const host = hostHeader?.split(",")[0]?.trim();

  const finalHost = forwardedHost || host;
  let finalProto = forwardedProto || request.nextUrl.protocol.replace(":", "");
  finalProto = finalProto.replace(":", "").toLowerCase();

  if (finalHost) {
    if (
      !finalHost.includes("0.0.0.0") &&
      !finalHost.startsWith("127.0.0.1") &&
      !finalHost.startsWith("localhost")
    ) {
      return `${finalProto}://${finalHost}`;
    }
  }

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

export function buildAuthorizationUrl(
  authorizeUrl: string,
  clientId: string,
  redirectUri: string,
  state: string,
  scopes: string[]
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    scope: scopes.join(" "),
  });

  return `${authorizeUrl}?${params.toString()}`;
}
