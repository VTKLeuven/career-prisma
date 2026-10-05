import argon2 from "argon2";
import { NextResponse } from "next/server";
import { validateInviteToken } from "@/lib/invite-token";
import { acceptUserInvite } from "@/lib/repos/credentials";

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
    return NextResponse.json(
      { error: "This invitation is invalid, expired, or already used" },
      { status: 400 }
    );
  }
  await acceptUserInvite(user.id, await argon2.hash(password));
  return NextResponse.json({ success: true });
}
