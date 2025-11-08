// proxy.ts
import { NextResponse, NextRequest } from "next/server";

const PREFIX = process.env.AUTH_COOKIE_PREFIX ?? "directus";
const ACCESS_COOKIE = `${PREFIX}_access`;
const REFRESH_COOKIE = `${PREFIX}_refresh`;
const DIRECTUS_URL = process.env.DIRECTUS_URL?.replace(/\/?$/, "/"); // ensure trailing slash

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

    if (newAccess) {
      res.cookies.set(ACCESS_COOKIE, newAccess, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        // Optional: set maxAge to match your Directus config
      });
    }
    if (newRefresh) {
      res.cookies.set(REFRESH_COOKIE, newRefresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
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

