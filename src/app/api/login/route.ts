// app/api/login/route.ts
import { NextResponse } from "next/server";

const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
const REFRESH_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_refresh`;

// Allowlist of Directus role IDs that may log in
const ALLOWED_ROLE_IDS = new Set<string>([
  "7b128ef4-f530-47d2-8f4c-ef82518eb313",
  "d5475bf4-a77f-48de-b06c-fac199b0f631",
]);

export async function POST(req: Request) {
  try {
    const { email, password, rememberMe } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    // Ensure rememberMe is a boolean
    const shouldRemember = Boolean(rememberMe);

    const rawBase = process.env.DIRECTUS_URL;
    if (!rawBase) {
      return NextResponse.json({ error: "DIRECTUS_URL is not configured." }, { status: 500 });
    }

    // Normalize base URL (ensure exactly one trailing slash)
    const base = rawBase.replace(/\/+$/, "") + "/";

    // 1) Authenticate with Directus
    const authRes = await fetch(base + "auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      // No credentials/cookies here; we only need tokens
    });

    if (!authRes.ok) {
      const err = await safeJson(authRes);
      const message = err?.errors?.[0]?.message ?? "Invalid credentials.";
      // Return 401 for bad credentials
      return NextResponse.json({ error: message }, { status: 401 });
    }

    const authData = await authRes.json();
    const { access_token, refresh_token, expires } = authData?.data ?? {};

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: "Auth response malformed." }, { status: 502 });
    }

    // 2) Fetch current user (include role)
    const meRes = await fetch(
      base + "users/me?fields=id,first_name,last_name,email,role.id,role.name",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!meRes.ok) {
      const err = await safeJson(meRes);
      return NextResponse.json(
        { error: err?.errors?.[0]?.message ?? "Failed to fetch user profile." },
        { status: 500 }
      );
    }

    const meData = await meRes.json();
    const me = meData?.data;

    const roleId: string | undefined = me?.role?.id;
    if (!roleId || !ALLOWED_ROLE_IDS.has(roleId)) {
      // 403 for “you are authenticated but not authorized”
      return NextResponse.json(
        { error: "User doesn't have the required access policies to access this application." },
        { status: 403 }
      );
    }

    // 3) Set secure httpOnly cookies
    const res = NextResponse.json({ message: "Successful login" });

    // Directus `expires` is in seconds (relative). Fallback to 1h.
    const accessMaxAge =
      Number.isFinite(expires) && typeof expires === "number"
        ? Math.max(1, Math.floor(expires))
        : 60 * 60;

    // Try to determine if the request is secure (proxy-friendly)
    const url = new URL(req.url);
    const xfProto = (typeof req.headers.get === "function" && req.headers.get("x-forwarded-proto")) || "";
    const isSecure =
      url.protocol === "https:" || xfProto.includes("https") || process.env.NODE_ENV === "production";

    // Extend cookie expiration if "remember me" is checked
    // Default: 14 days for refresh token, access token uses Directus expires
    // With remember me: 90 days for refresh token, extend access token to 7 days
    const refreshMaxAge = shouldRemember
      ? 60 * 60 * 24 * 90 // 90 days
      : 60 * 60 * 24 * 14; // 14 days

    const finalAccessMaxAge = shouldRemember
      ? 60 * 60 * 24 * 7 // 7 days when remember me is checked
      : accessMaxAge; // Use Directus expires otherwise

    res.cookies.set(ACCESS_COOKIE, access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      path: "/",
      maxAge: finalAccessMaxAge, // seconds
    });

    res.cookies.set(REFRESH_COOKIE, refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      path: "/",
      maxAge: refreshMaxAge,
    });

    return res;
  } catch (error) {
    // Body parse errors, network issues, unexpected shapes, etc.
    console.error("Login error:", error);
    return NextResponse.json({ error: "Unexpected error during login." }, { status: 500 });
  }
}

async function safeJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}
