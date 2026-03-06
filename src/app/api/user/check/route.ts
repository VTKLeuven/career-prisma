import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { getStudentFromCookies } from "@/lib/auth-student";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const debug =
    process.env.DEBUG_API_USER_CHECK === "1" ||
    process.env.DEBUG_API_USER_CHECK === "true";
  try {
    // Explicitly check both - don't rely on truthy values
    let user = await getUserFromCookies();
    const REFRESH_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_refresh`;
    const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
    let cookiesToSet: { name: string; value: string; options: any }[] = [];

    // If user check failed but we have a refresh token, try to refresh
    if (!user) {
      const { cookies: cookiesApi } = await import("next/headers");
      const cookieStore = await cookiesApi();
      const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

      if (refreshToken) {
        // Try to refresh the token
        if (debug) console.log("[API /user/check] Access token invalid, attempting refresh...");
        const rawBase = process.env.DIRECTUS_URL;
        if (rawBase) {
          const base = rawBase.replace(/\/+$/, "") + "/";

          const refreshRes = await fetch(base + "auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const { access_token, refresh_token: newRefreshToken, expires } = refreshData?.data ?? {};

            if (access_token) {
              // Determine secure context
              const url = new URL(request.url);
              const xfProto = request.headers.get("x-forwarded-proto") || "";
              const isSecure = url.protocol === "https:" || xfProto.includes("https") || process.env.NODE_ENV === "production";

              // Calculate expiration
              const accessMaxAge = Number.isFinite(expires) && typeof expires === "number"
                ? Math.max(1, Math.floor(expires))
                : 60 * 60;

              const accessExpires = new Date(Date.now() + accessMaxAge * 1000);

              // Refresh token expiration - default to 14 days
              const refreshMaxAge = 60 * 60 * 24 * 14; // 14 days
              const refreshExpires = new Date(Date.now() + refreshMaxAge * 1000);

              // Store cookies to set
              cookiesToSet.push({
                name: ACCESS_COOKIE,
                value: access_token,
                options: {
                  httpOnly: true,
                  sameSite: "lax" as const,
                  secure: isSecure,
                  path: "/",
                  maxAge: accessMaxAge,
                  expires: accessExpires,
                }
              });

              if (newRefreshToken) {
                cookiesToSet.push({
                  name: REFRESH_COOKIE,
                  value: newRefreshToken,
                  options: {
                    httpOnly: true,
                    sameSite: "lax" as const,
                    secure: isSecure,
                    path: "/",
                    maxAge: refreshMaxAge,
                    expires: refreshExpires,
                  }
                });
              }

              // Retry getting user with new token
              user = await getUserFromCookies();
              if (debug) {
                console.log(
                  "[API /user/check] Token refresh successful, user:",
                  user ? { id: user.id, email: user.email } : null,
                );
              }
            }
          } else {
            if (debug) console.log("[API /user/check] Token refresh failed:", refreshRes.status);
            // Clear invalid cookies
            const isSecure = request.url.startsWith("https:") || process.env.NODE_ENV === "production";
            cookiesToSet.push({
              name: ACCESS_COOKIE,
              value: "",
              options: {
                httpOnly: true,
                sameSite: "lax" as const,
                secure: isSecure,
                path: "/",
                maxAge: 0,
                expires: new Date(0),
              }
            });
            cookiesToSet.push({
              name: REFRESH_COOKIE,
              value: "",
              options: {
                httpOnly: true,
                sameSite: "lax" as const,
                secure: isSecure,
                path: "/",
                maxAge: 0,
                expires: new Date(0),
              }
            });
          }
        }
      }
    }

    const student = await getStudentFromCookies();
    if (debug) {
      console.log(
        "[API /user/check] getUserFromCookies returned:",
        user ? { id: user.id, email: user.email, hasCompany: !!user.company } : null,
      );
      console.log(
        "[API /user/check] getStudentFromCookies returned:",
        student ? { id: student.id, email: student.email } : null,
      );
    }

    // Validate and return user type information
    // Only return companyRep if user is actually defined and has required fields
    const companyRepData = (user && user.id && user.email) ? {
      authenticated: true,
      company: user.company ? (typeof user.company === 'string' ? { id: user.company } : user.company) : null,
      admin: user.admin || false,
      name: user.name || user.email || '',
      email: user.email || '',
      is_shifter: user.is_shifter || false,
    } : null;

    // Only return student if student is actually defined and has required fields
    const studentData = (student && student.id && student.email) ? {
      authenticated: true,
      id: student.id,
      firstName: student.first_name || null,
      lastName: student.last_name || null,
      email: student.email,
      is_shifter: student.is_shifter || false,
    } : null;
    if (debug) {
      console.log("[API /user/check] Returning:", {
        companyRep: companyRepData
          ? { authenticated: true, name: companyRepData.name }
          : null,
        student: studentData
          ? { authenticated: true, firstName: studentData.firstName }
          : null,
      });
    }

    const response = NextResponse.json({
      companyRep: companyRepData,
      student: studentData,
    });

    // Set cookies if we refreshed tokens
    for (const cookie of cookiesToSet) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }

    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('[API /user/check] Error:', error);
    // On any error, explicitly return null for both
    const errorResponse = NextResponse.json(
      { companyRep: null, student: null },
      { status: 200 }
    );

    // Prevent caching
    errorResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    errorResponse.headers.set('Pragma', 'no-cache');
    errorResponse.headers.set('Expires', '0');

    return errorResponse;
  }
}

