import argon2 from "argon2";
import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createSessionToken,
  sessionCookieOptions,
  STUDENT_SESSION_COOKIE,
} from "@/lib/auth-session";

const VERIFICATION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

async function studentForToken(token: string) {
  try {
    const [idValue, rawToken] = Buffer.from(token, "base64url")
      .toString("utf8")
      .split(":");
    const id = Number(idValue);
    if (!Number.isSafeInteger(id) || !rawToken) return null;

    const student = await prisma.student.findUnique({ where: { id } });
    if (
      !student ||
      student.verified ||
      !student.verification_token_hash ||
      !student.verification_token_created ||
      Date.now() - student.verification_token_created.getTime() >
        VERIFICATION_MAX_AGE_MS
    ) {
      return null;
    }

    const actual = Buffer.from(
      createHash("sha256").update(rawToken).digest("hex")
    );
    const expected = Buffer.from(student.verification_token_hash);
    return actual.length === expected.length &&
      timingSafeEqual(actual, expected)
      ? student
      : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { error: "Verification token is required" },
      { status: 400 }
    );
  }
  const student = await studentForToken(token);
  if (!student) {
    return NextResponse.json(
      { error: "Invalid or expired verification token" },
      { status: 400 }
    );
  }
  return NextResponse.json({
    email: student.email,
    firstName: student.first_name,
    lastName: student.last_name,
  });
}

export async function POST(request: NextRequest) {
  const { token, password } = await request
    .json()
    .catch(() => ({ token: null, password: null }));
  if (typeof token !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Token and password are required" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long" },
      { status: 400 }
    );
  }

  const student = await studentForToken(token);
  if (!student) {
    return NextResponse.json(
      { error: "Invalid or expired verification token" },
      { status: 400 }
    );
  }

  await prisma.student.update({
    where: { id: student.id },
    data: {
      password: await argon2.hash(password, { type: argon2.argon2id }),
      verified: true,
      verification_token_hash: null,
      verification_token_created: null,
      date_updated: new Date(),
    },
  });

  const response = NextResponse.json({
    success: true,
    message: "Email verified and password set successfully",
  });
  response.cookies.set(
    STUDENT_SESSION_COOKIE,
    createSessionToken(student.id, "student", SESSION_MAX_AGE_SECONDS),
    sessionCookieOptions(request, SESSION_MAX_AGE_SECONDS)
  );
  return response;
}
