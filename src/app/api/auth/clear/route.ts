// app/api/auth/clear/route.ts
import { NextResponse } from "next/server";

const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
const REFRESH_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_refresh`;
const REMEMBER_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_remember`;
const STUDENT_SESSION_COOKIE = "student_session";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const xfProto = (typeof req.headers.get === "function" && req.headers.get("x-forwarded-proto")) || "";
  const isSecure = url.protocol === "https:" || xfProto.includes("https") || process.env.NODE_ENV === "production";

  const res = NextResponse.json({ ok: true });

  const deleteOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecure,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };

  // Clear all possible auth cookies
  res.cookies.set(ACCESS_COOKIE, "", deleteOpts);
  res.cookies.set(REFRESH_COOKIE, "", deleteOpts);
  res.cookies.set(REMEMBER_COOKIE, "", deleteOpts);
  res.cookies.set(STUDENT_SESSION_COOKIE, "", deleteOpts);

  return res;
}

