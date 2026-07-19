import argon2 from "argon2";
import { NextResponse } from "next/server";
import { validateInviteToken } from "@/lib/invite-token";
import prisma from "@/lib/prisma";

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
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await argon2.hash(password),
      status: "active",
      invite_token_hash: null,
      invite_token_created: null,
    },
  });
  return NextResponse.json({ success: true });
}
