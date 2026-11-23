import argon2 from "argon2";
import { NextRequest, NextResponse } from "next/server";
import { resetUserPassword } from "@/lib/repos/credentials";
import { findUserForPasswordReset } from "@/lib/password-reset";
import { logSystemEvent } from "@/lib/repos/system-logs";

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
    // No email to name: the token is all we have, and it is never logged.
    await logSystemEvent({
      source: "user_accounts",
      level: "warn",
      event: "password_reset_rejected",
      capped: true,
      message: user
        ? `Password reset link used for an account that is ${user.status}`
        : "Password reset link is invalid or expired",
      details: user ? { userId: user.id, status: user.status } : undefined,
    });
    return NextResponse.json(
      {
        error:
          "Invalid or expired reset token. Please request a new password reset link.",
      },
      { status: 400 }
    );
  }

  await resetUserPassword(user.id, await argon2.hash(password, { type: argon2.argon2id }));
  await logSystemEvent({
    source: "user_accounts",
    level: "info",
    event: "password_reset_completed",
    message: `${user.email ?? user.id} set a new password through a reset link`,
    details: { userId: user.id, email: user.email },
  });
  return NextResponse.json({ success: true });
}
