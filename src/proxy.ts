// proxy.ts
import { NextResponse, NextRequest } from "next/server";

const PREFIX = process.env.AUTH_COOKIE_PREFIX ?? "directus";
const ACCESS_COOKIE = `${PREFIX}_access`;
const REFRESH_COOKIE = `${PREFIX}_refresh`;
const REMEMBER_COOKIE = `${PREFIX}_remember`;
const DIRECTUS_URL = (process.env.DIRECTUS_URL || "http://localhost:8055").replace(/\/?$/, "/"); // ensure trailing slash

// Helper: decode JWT payload without verifying (good enough to check exp)
// Must be Edge-compatible (no Node.js Buffer in middleware runtime).
function decodeJwtPayload(token: string) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return {};
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = globalThis.atob(padded);
    return JSON.parse(json) as { exp?: number };
  } catch {
    return {};
  }
}

function buildCookieHeader(
  req: NextRequest,
  overrides: Record<string, string | undefined>
) {
  const map = new Map<string, string>();
  for (const c of req.cookies.getAll()) {
    map.set(c.name, c.value);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) continue;
    if (v === "") map.delete(k);
    else map.set(k, v);
  }
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

export async function proxy(req: NextRequest) {
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  const rememberCookie = req.cookies.get(REMEMBER_COOKIE)?.value;

  // If no tokens, let it pass (public pages will work; authed pages should handle lack of user)
  if (!access || !refresh) return NextResponse.next();

  // Check if access token is expired (or malformed)
  const { exp } = decodeJwtPayload(access);
  const isExpired = !exp || exp * 1000 <= Date.now();

  if (!isExpired) return NextResponse.next();

  // Access expired — try to refresh with Directus
  try {
    const r = await fetch(`${DIRECTUS_URL}auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
      // Proxy runs at the edge; keep it simple.
    });

    if (!r.ok) {
      // Refresh failed: clear cookies so the app can treat user as signed out
      const cleared = NextResponse.next();
      cleared.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
      cleared.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
      cleared.cookies.set(REMEMBER_COOKIE, "", { path: "/", maxAge: 0 });
      return cleared;
    }

    const { data } = await r.json();
    const newAccess = data?.access_token as string | undefined;
    const newRefresh = data?.refresh_token as string | undefined;

    // Determine whether "remember me" is active.
    // Prefer explicit cookie (works even if refresh token is opaque); fallback to refresh token exp heuristic.
    let isRememberMe =
      rememberCookie === "1" ? true : rememberCookie === "0" ? false : false;
    if (rememberCookie !== "1" && rememberCookie !== "0" && refresh) {
      const refreshPayload = decodeJwtPayload(refresh);
      if (refreshPayload.exp) {
        const daysUntilExpiry = (refreshPayload.exp * 1000 - Date.now()) / (1000 * 60 * 60 * 24);
        isRememberMe = daysUntilExpiry > 30; // More than 30 days suggests "remember me"
      }
    }
    
    // Set appropriate expiration times
    const refreshMaxAge = isRememberMe 
      ? 60 * 60 * 24 * 90 // 90 days (preserve "remember me")
      : 60 * 60 * 24 * 14; // 14 days default
    
    const accessMaxAge = isRememberMe
      ? 60 * 60 * 24 * 7 // 7 days when "remember me" is active
      : 60 * 60; // 1 hour default (matches Directus typical expiration)

    // Try to determine if the request is secure (proxy-friendly)
    const url = new URL(req.url);
    const xfProto = req.headers.get("x-forwarded-proto") || "";
    const isSecure = url.protocol === "https:" || xfProto.includes("https") || process.env.NODE_ENV === "production";

    const overrides: Record<string, string | undefined> = {
      [ACCESS_COOKIE]: newAccess,
      [REFRESH_COOKIE]: newRefresh ?? refresh,
      [REMEMBER_COOKIE]: rememberCookie,
    };
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("cookie", buildCookieHeader(req, overrides));
    const res = NextResponse.next({ request: { headers: requestHeaders } });

    if (newAccess) {
      const accessExpires = new Date(Date.now() + accessMaxAge * 1000);
      res.cookies.set(ACCESS_COOKIE, newAccess, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: accessMaxAge,
        expires: accessExpires,
      });
    }
    if (newRefresh) {
      const refreshExpires = new Date(Date.now() + refreshMaxAge * 1000);
      res.cookies.set(REFRESH_COOKIE, newRefresh, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: refreshMaxAge,
        expires: refreshExpires,
      });
    }

    // Keep remember-me flag in sync (sliding expiration).
    if (rememberCookie === "1" || rememberCookie === "0") {
      const rememberExpires = new Date(Date.now() + refreshMaxAge * 1000);
      res.cookies.set(REMEMBER_COOKIE, rememberCookie, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: refreshMaxAge,
        expires: rememberExpires,
      });
    }
    return res;
  } catch {
    // Network or other error — don't crash the request
    return NextResponse.next();
  }
}

// (Optional) Apply to all routes, or restrict with a matcher
export const config = {
  // Skip static assets and Next internals for performance
  matcher: ["/((?!_next/|.*\\.(?:png|jpg|jpeg|svg|gif|ico|css|js|map|txt)).*)"],
};

