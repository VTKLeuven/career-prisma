import argon2 from "argon2";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { findUserForPasswordReset } from "@/lib/password-reset";

export async function POST(request: NextRequest) {
  const { token, password } = await request
    .json()
    .catch(() => ({ token: null, password: null }));
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long" },
      { status: 400 }
    );
  }

  const user = await findUserForPasswordReset(token);
  if (!user || (user.status !== "active" && user.status !== "invited")) {
    return NextResponse.json(
      {
        error:
          "Invalid or expired reset token. Please request a new password reset link.",
      },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await argon2.hash(password, { type: argon2.argon2id }),
      password_reset_token: null,
      password_reset_token_created: null,
      status: "active",
    },
  });
  return NextResponse.json({ success: true });
}
