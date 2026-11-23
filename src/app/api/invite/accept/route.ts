import argon2 from "argon2";
import { NextResponse } from "next/server";
import { validateInviteToken } from "@/lib/invite-token";
import { acceptUserInvite } from "@/lib/repos/credentials";
import { logSystemEvent } from "@/lib/repos/system-logs";

export async function POST(request: Request) {
  const { token, password } = await request.json();
  if (typeof token !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Invite token and password are required" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long" },
      { status: 400 }
    );
  }
  const user = await validateInviteToken(token);
  if (!user) {
    await logSystemEvent({
      source: "user_accounts",
      level: "warn",
      event: "invite_rejected",
      capped: true,
      message: "Invite link is invalid, expired or already used",
    });
    return NextResponse.json(
      { error: "This invitation is invalid, expired, or already used" },
      { status: 400 }
    );
  }
  await acceptUserInvite(user.id, await argon2.hash(password));
  await logSystemEvent({
    source: "user_accounts",
    level: "info",
    event: "invite_accepted",
    message: `${user.email ?? user.id} accepted their invite and set a password`,
    details: { userId: user.id, email: user.email, companyId: user.company_id },
  });
  return NextResponse.json({ success: true });
}
