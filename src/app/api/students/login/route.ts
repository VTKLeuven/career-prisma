import argon2 from "argon2";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createSessionToken,
  sessionCookieOptions,
  STUDENT_SESSION_COOKIE,
} from "@/lib/auth-session";

async function verifyPassword(stored: string, password: string) {
  if (!stored.startsWith("$argon2")) return false;
  return argon2.verify(stored, password);
}

export async function POST(request: Request) {
  try {
    const { email, password, rememberMe } = await request.json();
    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!student?.password || !student.verified) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!(await verifyPassword(student.password, password))) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
    });
    response.cookies.set(
      STUDENT_SESSION_COOKIE,
      createSessionToken(student.id, "student", maxAge),
      sessionCookieOptions(request, maxAge)
    );
    return response;
  } catch (error) {
    console.error("Student login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
