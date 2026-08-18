import argon2 from "argon2";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createSessionToken,
  sessionCookieOptions,
  USER_SESSION_COOKIE,
} from "@/lib/auth-session";

// Only these roles may sign in at all. Any other role -- "Student", or one
// created later -- is rejected with the same message as a bad password, which
// is why an account can look perfectly healthy in the database and still 401.
//
// Match on the id, never the name: the names do not mean what they look like.
// The *salesperson* role is the one called "VTK Career", and "Administrator" is
// the internal role that deliberately is not a salesperson.
const ALLOWED_ROLE_IDS = new Set([
  "7b128ef4-f530-47d2-8f4c-ef82518eb313", // "VTK Career"
  "d5475bf4-a77f-48de-b06c-fac199b0f631", // "Company Rep"
  "c4e63615-ed81-45d1-8145-1b88137e60cb", // "Administrator"
]);

export async function POST(request: Request) {
  try {
    const { email, password, rememberMe } = await request.json();
    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (
      !user ||
      user.status !== "active" ||
      !user.password ||
      !user.role_id ||
      !ALLOWED_ROLE_IDS.has(user.role_id) ||
      !(await argon2.verify(user.password, password))
    ) {
      return NextResponse.json(
        { error: "Invalid credentials or insufficient access." },
        { status: 401 },
      );
    }

    const maxAge = rememberMe ? 90 * 24 * 60 * 60 : 14 * 24 * 60 * 60;
    const response = NextResponse.json({ message: "Successful login" });
    response.cookies.set(
      USER_SESSION_COOKIE,
      createSessionToken(user.id, "user", maxAge),
      sessionCookieOptions(request, maxAge),
    );
    await prisma.user.update({
      where: { id: user.id },
      data: { last_access: new Date() },
    });
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Unexpected error during login." },
      { status: 500 },
    );
  }
}
