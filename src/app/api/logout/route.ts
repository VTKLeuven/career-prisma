import { NextResponse } from "next/server";
import {
  expiredSessionCookieOptions,
  USER_SESSION_COOKIE,
} from "@/lib/auth-session";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    USER_SESSION_COOKIE,
    "",
    expiredSessionCookieOptions(request)
  );
  return response;
}
