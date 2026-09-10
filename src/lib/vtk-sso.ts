// lib/vtk-sso.ts — the VTK SSO (OpenID Connect) client.
//
// Replaces the hand-rolled LITUS OAuth flow that talked to the old VTK site.
// The new site runs better-auth's SSO provider, which is a standard OIDC
// authorization-code provider with discovery, PKCE and a userinfo endpoint —
// so this file speaks OIDC properly instead of the LITUS-specific dialect.
//
// No OIDC library on purpose. Same reason `auth-session.ts` mints its own
// cookies: the flow is small enough to read in one sitting, and pulling in
// `openid-client` would drag a second, differently-configured auth stack into
// a codebase that already has NextAuth sitting in the corner for KU Leuven.

import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const STATE_COOKIE = "vtk_sso_state";
const VERIFIER_COOKIE = "vtk_sso_verifier";
const NONCE_COOKIE = "vtk_sso_nonce";
const REDIRECT_COOKIE = "vtk_sso_redirect_to";

/**
 * Marks a browser as "this student signs in through the SSO". Long-lived and
 * deliberately separate from the session cookie: it is what lets an expired
 * 24-hour session bounce silently through the SSO instead of showing a login
 * form. Cleared on logout, so signing out does not immediately sign you back
 * in. See `/student-login` and `docs/auth.md`.
 */
export const SSO_HINT_COOKIE = "student_sso";

/** How long the user has to finish the flow at the SSO before state expires. */
const FLOW_DURATION = 60 * 30; // 30 minutes

/** How long the hint cookie survives. Long — it holds no privilege at all. */
export const SSO_HINT_DURATION = 60 * 60 * 24 * 365; // 1 year

/**
 * Student sessions last a day. The SSO's own session is much longer, so an
 * expired session costs the student a redirect they never see rather than a
 * login screen — which is the whole reason we can afford to keep it this
 * short. Password ("external") students are not capped this way: they have no
 * SSO to bounce through, so a 24-hour cap would just mean a daily password
 * prompt.
 */
export const STUDENT_SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

/**
 * Scopes VTK Career asks for. The sensitive scopes the SSO offers that we
 * deliberately do NOT request:
 *
 * - `offline_access` — claims are re-read on every login flow instead of
 *   refreshed in the background, so a refresh token would be a stored
 *   credential with nothing to do.
 * - `address`, `phone`, `vtk:contact` — Career has no use for them.
 *
 * `vtk:student_number` IS requested despite its sensitive-consent prompt: the
 * r-number is what matches a student to the row they already have from the old
 * LITUS login. See `upsertStudentFromSso()`.
 */
const DEFAULT_SCOPES = [
  "openid",
  "profile",
  "email",
  "vtk:study_programme",
  "vtk:study_year",
  "vtk:student_number",
];

export interface SsoConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

export interface SsoEndpoints {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  issuer: string;
}

/** Reads config from the environment, or explains exactly what is missing. */
export function getSsoConfig(): SsoConfig | { error: string } {
  const issuer = process.env.VTK_SSO_ISSUER?.replace(/\/+$/, "");
  const clientId = process.env.VTK_SSO_CLIENT_ID;
  const clientSecret = process.env.VTK_SSO_CLIENT_SECRET;

  const missing = [
    !issuer && "VTK_SSO_ISSUER",
    !clientId && "VTK_SSO_CLIENT_ID",
    !clientSecret && "VTK_SSO_CLIENT_SECRET",
  ].filter(Boolean);

  if (missing.length) {
    return { error: `VTK SSO is not configured. Missing: ${missing.join(", ")}.` };
  }

  const scopes =
    process.env.VTK_SSO_SCOPES?.split(/[\s,]+/).filter(Boolean) ?? DEFAULT_SCOPES;

  return { issuer: issuer!, clientId: clientId!, clientSecret: clientSecret!, scopes };
}

/* ------------------------------------------------------------------ *
 * Discovery
 * ------------------------------------------------------------------ */

let discoveryCache: { issuer: string; endpoints: SsoEndpoints; fetchedAt: number } | null =
  null;
const DISCOVERY_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetches `/.well-known/openid-configuration`, cached in module scope. The
 * cache is per server process and short-lived — the endpoints only move when
 * the SSO itself is redeployed, and a stale entry costs one failed login.
 */
export async function discover(issuer: string): Promise<SsoEndpoints> {
  if (
    discoveryCache &&
    discoveryCache.issuer === issuer &&
    Date.now() - discoveryCache.fetchedAt < DISCOVERY_TTL_MS
  ) {
    return discoveryCache.endpoints;
  }

  const url = `${issuer}/.well-known/openid-configuration`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`OIDC discovery failed: ${response.status} at ${url}`);
  }

  const doc = (await response.json()) as Partial<SsoEndpoints>;
  if (!doc.authorization_endpoint || !doc.token_endpoint || !doc.userinfo_endpoint) {
    throw new Error(`OIDC discovery document is missing endpoints at ${url}`);
  }

  const endpoints: SsoEndpoints = {
    authorization_endpoint: doc.authorization_endpoint,
    token_endpoint: doc.token_endpoint,
    userinfo_endpoint: doc.userinfo_endpoint,
    issuer: doc.issuer ?? issuer,
  };

  discoveryCache = { issuer, endpoints, fetchedAt: Date.now() };
  return endpoints;
}

/* ------------------------------------------------------------------ *
 * PKCE, state and nonce
 * ------------------------------------------------------------------ */

function base64url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

export function generateState(): string {
  return base64url(crypto.randomBytes(32));
}

export function generateCodeVerifier(): string {
  return base64url(crypto.randomBytes(32));
}

export function codeChallengeFor(verifier: string): string {
  return base64url(crypto.createHash("sha256").update(verifier).digest());
}

/**
 * On production the callback can land on a different subdomain than the one
 * that started the flow (apex vs www), so the flow cookies get a shared
 * `.career.vtk.be` domain. Inherited from the LITUS flow, where it fixed a
 * real bug — do not simplify it away.
 */
export function flowCookieDomain(request: NextRequest): string | undefined {
  const rawHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const host = rawHost.split(",")[0]?.trim().toLowerCase() ?? "";
  const hostNoPort = host.split(":")[0] ?? host;
  return process.env.NODE_ENV === "production" && hostNoPort.endsWith("career.vtk.be")
    ? ".career.vtk.be"
    : undefined;
}

export interface FlowState {
  state: string;
  verifier: string;
  nonce: string;
  redirectTo: string;
}

export async function storeFlowState(
  flow: FlowState,
  domain: string | undefined
): Promise<void> {
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: FLOW_DURATION,
    path: "/",
    domain,
  };

  cookieStore.set(STATE_COOKIE, flow.state, options);
  cookieStore.set(VERIFIER_COOKIE, flow.verifier, options);
  cookieStore.set(NONCE_COOKIE, flow.nonce, options);
  cookieStore.set(REDIRECT_COOKIE, flow.redirectTo, options);
}

/** Reads the flow cookies without clearing them. */
export async function readFlowState(): Promise<Partial<FlowState>> {
  const cookieStore = await cookies();
  return {
    state: cookieStore.get(STATE_COOKIE)?.value,
    verifier: cookieStore.get(VERIFIER_COOKIE)?.value,
    nonce: cookieStore.get(NONCE_COOKIE)?.value,
    redirectTo: cookieStore.get(REDIRECT_COOKIE)?.value,
  };
}

export async function clearFlowState(): Promise<void> {
  const cookieStore = await cookies();
  for (const name of [STATE_COOKIE, VERIFIER_COOKIE, NONCE_COOKIE, REDIRECT_COOKIE]) {
    cookieStore.delete(name);
  }
}

/** Constant-time compare, so a wrong `state` leaks nothing through timing. */
export function statesMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/* ------------------------------------------------------------------ *
 * Request origin
 * ------------------------------------------------------------------ */

/**
 * The public origin of this app, for building the redirect URI. Env wins over
 * headers, because behind the reverse proxy the request headers are the least
 * trustworthy source. Carried over unchanged from the LITUS flow.
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
      return new URL(candidate).origin;
    } catch {
      // Ignore invalid URL and continue.
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.split(",")[0]?.trim();
  const proto = (forwardedProto || request.nextUrl.protocol.replace(":", ""))
    .replace(":", "")
    .toLowerCase();

  if (
    host &&
    !host.includes("0.0.0.0") &&
    !host.startsWith("127.0.0.1") &&
    !host.startsWith("localhost")
  ) {
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
}

/** The redirect URI registered with the SSO. */
export function getCallbackUrl(request: NextRequest): string {
  return (
    process.env.VTK_SSO_CALLBACK_URL ||
    `${getRequestOrigin(request)}/api/auth/oauth/callback`
  );
}

/** Where the user lands after the whole flow completes. */
export function getFrontendUrl(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_FORM_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.FRONTEND_URL ||
    getRequestOrigin(request)
  );
}

/* ------------------------------------------------------------------ *
 * Authorization request
 * ------------------------------------------------------------------ */

export function buildAuthorizationUrl(
  endpoints: SsoEndpoints,
  config: SsoConfig,
  redirectUri: string,
  flow: { state: string; nonce: string; challenge: string }
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scopes.join(" "),
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: flow.challenge,
    code_challenge_method: "S256",
  });

  return `${endpoints.authorization_endpoint}?${params.toString()}`;
}

/* ------------------------------------------------------------------ *
 * Token exchange
 * ------------------------------------------------------------------ */

export interface TokenResponse {
  access_token: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

export async function exchangeCode(
  endpoints: SsoEndpoints,
  config: SsoConfig,
  code: string,
  redirectUri: string,
  verifier: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
    client_id: config.clientId,
  });

  const response = await fetch(endpoints.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      // client_secret_basic. better-auth accepts the secret in the body too,
      // but Basic is the OIDC default and keeps the secret out of any proxy
      // log that happens to record request bodies.
      Authorization:
        "Basic " +
        Buffer.from(
          `${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`
        ).toString("base64"),
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as Partial<TokenResponse>;
  if (!data.access_token) {
    throw new Error("Token response contained no access_token");
  }

  return data as TokenResponse;
}

/* ------------------------------------------------------------------ *
 * Claims
 * ------------------------------------------------------------------ */

export type Claims = Record<string, unknown>;

/**
 * Decodes an ID token payload WITHOUT verifying its signature.
 *
 * That is safe here and only here: the token came back on our own TLS
 * connection to the token endpoint, authenticated with the client secret, so
 * nobody could have substituted it — OIDC Core 3.1.3.7 allows skipping
 * signature validation in exactly this case. `iss`, `aud`, `exp` and `nonce`
 * are still checked below, because those catch provider-side mistakes and
 * replay rather than forgery. Never call this on a token that arrived any
 * other way.
 */
export function decodeIdToken(idToken: string): Claims | null {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Claims;
  } catch {
    return null;
  }
}

export function validateIdTokenClaims(
  claims: Claims,
  expected: { issuer: string; clientId: string; nonce: string }
): string | null {
  const issuer = typeof claims.iss === "string" ? claims.iss.replace(/\/+$/, "") : "";
  if (issuer !== expected.issuer.replace(/\/+$/, "")) {
    return `ID token issuer mismatch (got "${issuer}")`;
  }

  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes(expected.clientId)) {
    return "ID token audience does not include this client";
  }

  if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) {
    return "ID token has expired";
  }

  // A replayed authorization response would carry the previous flow's nonce.
  if (claims.nonce !== expected.nonce) {
    return "ID token nonce does not match this login attempt";
  }

  return null;
}

export async function fetchUserInfo(
  endpoints: SsoEndpoints,
  accessToken: string
): Promise<Claims> {
  const response = await fetch(endpoints.userinfo_endpoint, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Userinfo failed (${response.status}): ${text.slice(0, 300)}`);
  }

  return (await response.json()) as Claims;
}
