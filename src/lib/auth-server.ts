// lib/auth-server.ts
import "server-only";
import { createDirectus, readMe, rest, staticToken } from "@directus/sdk";
import { DirectusRole, DirectusUser } from "@/lib/schema";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://localhost:8055";
const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
const REFRESH_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_refresh`;
const REMEMBER_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_remember`;

type CookieToSet = { name: string; value: string; options: any };

async function getUserFromAccessToken(token: string): Promise<DirectusUser | undefined> {
  try {
    const directus = createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());

    // Try to fetch user info - this will throw if token is invalid/expired
    const me = await directus.request(
      readMe({
        fields: ["*", { role: ["*"], company: ["*", "sub_options.*", "sub_options.career_sub_option_id.*"] } as any],
      })
    ) as any;

    // Validate that we actually got a valid user response with required fields
    if (!me || !me.id || !me.email || !me.role || !me.role.id) {
      console.log("[getUserFromAccessToken] Invalid user data returned from Directus");
      return undefined;
    }

    // Check for admin capability dynamically
    const role = me.role as any;
    const isAdmin = role?.admin_access === true || role?.name === "Administrator" || role?.id === "7b128ef4-f530-47d2-8f4c-ef82518eb313";

    return {
      id: me.id,
      name:
        (me.first_name || me.last_name
          ? `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim()
          : me.email) ?? "",
      email: me.email ?? "",
      tel: me?.tel ?? "not set",
      role: (me.role as DirectusRole)?.name ?? "Unknown",
      admin: isAdmin,
      company: me.company,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.log("[getUserFromAccessToken] Auth error:", error.message);
    } else {
      console.log("[getUserFromAccessToken] Auth error: Unknown error");
    }
    return undefined;
  }
}

export async function getUserFromCookies(): Promise<DirectusUser | undefined> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) return undefined;
  return getUserFromAccessToken(token);
}

/**
 * For route handlers: attempt Directus refresh if access token is missing/expired.
 * Returns the user (if any) and any cookies that should be written to the response.
 */
export async function getUserFromRequestWithRefresh(
  request: NextRequest
): Promise<{ user: DirectusUser | undefined; cookiesToSet: CookieToSet[] }> {
  const cookieStore = await cookies();
  const existingAccess = cookieStore.get(ACCESS_COOKIE)?.value;
  const existingRefresh = cookieStore.get(REFRESH_COOKIE)?.value;
  const rememberCookie = cookieStore.get(REMEMBER_COOKIE)?.value;

  // Fast path: access token still valid
  if (existingAccess) {
    const user = await getUserFromAccessToken(existingAccess);
    if (user) return { user, cookiesToSet: [] };
  }

  // No refresh token available → cannot recover
  if (!existingRefresh) {
    return { user: undefined, cookiesToSet: [] };
  }

  try {
    const base = DIRECTUS_URL.replace(/\/+$/, "") + "/";
    const refreshRes = await fetch(base + "auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: existingRefresh }),
    });

    if (!refreshRes.ok) {
      return { user: undefined, cookiesToSet: [] };
    }

    const refreshData = await refreshRes.json();
    const { access_token, refresh_token: newRefreshToken, expires } = refreshData?.data ?? {};
    if (!access_token) {
      return { user: undefined, cookiesToSet: [] };
    }

    const url = new URL(request.url);
    const xfProto = request.headers.get("x-forwarded-proto") || "";
    const isSecure = url.protocol === "https:" || xfProto.includes("https") || process.env.NODE_ENV === "production";

    const accessMaxAge =
      Number.isFinite(expires) && typeof expires === "number" ? Math.max(1, Math.floor(expires)) : 60 * 60;

    const isRememberMe = rememberCookie === "1";
    const finalAccessMaxAge = isRememberMe ? 60 * 60 * 24 * 7 : accessMaxAge;
    const refreshMaxAge = isRememberMe ? 60 * 60 * 24 * 90 : 60 * 60 * 24 * 14;

    const accessExpires = new Date(Date.now() + finalAccessMaxAge * 1000);
    const refreshExpires = new Date(Date.now() + refreshMaxAge * 1000);

    const cookiesToSet: CookieToSet[] = [
      {
        name: ACCESS_COOKIE,
        value: access_token,
        options: {
          httpOnly: true,
          sameSite: "lax",
          secure: isSecure,
          path: "/",
          maxAge: finalAccessMaxAge,
          expires: accessExpires,
        },
      },
    ];

    if (newRefreshToken) {
      cookiesToSet.push({
        name: REFRESH_COOKIE,
        value: newRefreshToken,
        options: {
          httpOnly: true,
          sameSite: "lax",
          secure: isSecure,
          path: "/",
          maxAge: refreshMaxAge,
          expires: refreshExpires,
        },
      });
    }

    if (rememberCookie === "1" || rememberCookie === "0") {
      cookiesToSet.push({
        name: REMEMBER_COOKIE,
        value: rememberCookie,
        options: {
          httpOnly: true,
          sameSite: "lax",
          secure: isSecure,
          path: "/",
          maxAge: refreshMaxAge,
          expires: refreshExpires,
        },
      });
    }

    const user = await getUserFromAccessToken(access_token);
    return { user, cookiesToSet };
  } catch {
    return { user: undefined, cookiesToSet: [] };
  }
}
