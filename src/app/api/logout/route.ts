// app/api/logout/route.ts
import { NextResponse } from "next/server";

const ACCESS_COOKIE  = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
const REFRESH_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_refresh`;
const REMEMBER_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_remember`;

export async function POST(req: Request) {
  // Match the cookie flags to how you set them on login
  const url = new URL(req.url);
  const isSecure = url.protocol === "https:" || process.env.NODE_ENV === "production";

  const res = NextResponse.json({ ok: true });

  // Use both maxAge: 0 and an expired date for widest compatibility
  const deleteOpts = {
    httpOnly: true,
    sameSite: "lax" as const, // if you used "none" when setting, use "none" here too
    secure: isSecure,         // must match the scheme, or the browser will ignore it
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };

  res.cookies.set(ACCESS_COOKIE, "", deleteOpts);
  res.cookies.set(REFRESH_COOKIE, "", deleteOpts);
  res.cookies.set(REMEMBER_COOKIE, "", deleteOpts);

  return res;
}
