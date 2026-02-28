// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
const REFRESH_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_refresh`;
const REMEMBER_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_remember`;

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
    const rememberCookie = cookieStore.get(REMEMBER_COOKIE)?.value;
    
    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    const rawBase = process.env.DIRECTUS_URL;
    if (!rawBase) {
      return NextResponse.json({ error: "DIRECTUS_URL not configured" }, { status: 500 });
    }

    const base = rawBase.replace(/\/+$/, "") + "/";
    
    // Call Directus refresh endpoint
    const refreshRes = await fetch(base + "auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!refreshRes.ok) {
      // Refresh token is invalid/expired - clear cookies
      const response = NextResponse.json({ error: "Refresh failed" }, { status: 401 });
      const isSecure = req.url.startsWith("https:") || process.env.NODE_ENV === "production";
      
      response.cookies.set(ACCESS_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: isSecure,
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
      
      response.cookies.set(REFRESH_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: isSecure,
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });

      response.cookies.set(REMEMBER_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: isSecure,
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
      
      return response;
    }

    const refreshData = await refreshRes.json();
    const { access_token, refresh_token: newRefreshToken, expires } = refreshData?.data ?? {};

    if (!access_token) {
      return NextResponse.json({ error: "No access token in response" }, { status: 500 });
    }

    // Determine secure context
    const url = new URL(req.url);
    const xfProto = req.headers.get("x-forwarded-proto") || "";
    const isSecure = url.protocol === "https:" || xfProto.includes("https") || process.env.NODE_ENV === "production";

    // Calculate expiration
    const accessMaxAge = Number.isFinite(expires) && typeof expires === "number"
      ? Math.max(1, Math.floor(expires))
      : 60 * 60;
    
    const accessExpires = new Date(Date.now() + accessMaxAge * 1000);

    // Respect "remember me" for cookie lifetimes (access tokens themselves still expire server-side).
    const isRememberMe = rememberCookie === "1";
    const refreshMaxAge = isRememberMe
      ? 60 * 60 * 24 * 90 // 90 days
      : 60 * 60 * 24 * 14; // 14 days
    const refreshExpires = new Date(Date.now() + refreshMaxAge * 1000);
    const finalAccessMaxAge = isRememberMe
      ? 60 * 60 * 24 * 7 // 7 days
      : accessMaxAge;
    const accessExpiresFinal = new Date(Date.now() + finalAccessMaxAge * 1000);

    // Set new cookies
    const response = NextResponse.json({ success: true });
    
    response.cookies.set(ACCESS_COOKIE, access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      path: "/",
      maxAge: finalAccessMaxAge,
      expires: accessExpiresFinal,
    });

    if (newRefreshToken) {
      response.cookies.set(REFRESH_COOKIE, newRefreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: isSecure,
        path: "/",
        maxAge: refreshMaxAge,
        expires: refreshExpires,
      });
    }

    if (rememberCookie === "1" || rememberCookie === "0") {
      response.cookies.set(REMEMBER_COOKIE, rememberCookie, {
        httpOnly: true,
        sameSite: "lax",
        secure: isSecure,
        path: "/",
        maxAge: refreshMaxAge,
        expires: refreshExpires,
      });
    }

    return response;
  } catch (error) {
    console.error("Refresh token error:", error);
    return NextResponse.json({ error: "Unexpected error during refresh" }, { status: 500 });
  }
}

