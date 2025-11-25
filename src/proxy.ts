// proxy.ts
import { NextResponse, NextRequest } from "next/server";

const PREFIX = process.env.AUTH_COOKIE_PREFIX ?? "directus";
const ACCESS_COOKIE = `${PREFIX}_access`;
const REFRESH_COOKIE = `${PREFIX}_refresh`;
const DIRECTUS_URL = (process.env.DIRECTUS_URL || "http://localhost:8055").replace(/\/?$/, "/"); // ensure trailing slash

// Helper: decode JWT payload without verifying (good enough to check exp)
function decodeJwtPayload(token: string) {
  try {
    const base64 = token.split(".")[1];
    const json = Buffer.from(base64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json) as { exp?: number };
  } catch {
    return {};
  }
}

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  // If no tokens, let it pass (public pages will work; authed pages should handle lack of user)
  if (!access || !refresh) return res;

  // Check if access token is expired (or malformed)
  const { exp } = decodeJwtPayload(access);
  const isExpired = !exp || exp * 1000 <= Date.now();

  if (!isExpired) return res;

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
      res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
      res.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
      return res;
    }

    const { data } = await r.json();
    const newAccess = data?.access_token as string | undefined;
    const newRefresh = data?.refresh_token as string | undefined;

    // Decode the refresh token to check its expiration
    // This helps us determine if "remember me" was checked
    // If the refresh token expires in more than 30 days, assume "remember me" was checked
    let isRememberMe = false;
    if (refresh) {
      const refreshPayload = decodeJwtPayload(refresh);
      if (refreshPayload.exp) {
        const daysUntilExpiry = (refreshPayload.exp * 1000 - Date.now()) / (1000 * 60 * 60 * 24);
        isRememberMe = daysUntilExpiry > 30; // More than 30 days suggests "remember me"
      }
    }
    
    // Set appropriate expiration times
    // Default to "remember me" behavior (longer expiration) to preserve user sessions
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
    return res;
  } catch {
    // Network or other error — don't crash the request
    return res;
  }
}

// (Optional) Apply to all routes, or restrict with a matcher
export const config = {
  // Skip static assets and Next internals for performance
  matcher: ["/((?!_next/|.*\\.(?:png|jpg|jpeg|svg|gif|ico|css|js|map|txt)).*)"],
};

