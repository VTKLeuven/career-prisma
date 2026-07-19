// app/api/auth/clear/route.ts
import { NextResponse } from "next/server";
import {
  expiredSessionCookieOptions,
  STUDENT_SESSION_COOKIE,
  USER_SESSION_COOKIE,
} from "@/lib/auth-session";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  const deleteOpts = expiredSessionCookieOptions(req);
  res.cookies.set(USER_SESSION_COOKIE, "", deleteOpts);
  res.cookies.set(STUDENT_SESSION_COOKIE, "", deleteOpts);

  return res;
}
