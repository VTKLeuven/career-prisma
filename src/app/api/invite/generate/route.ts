import { NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { generateInviteTokenServer } from "@/lib/invite-token";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const currentUser = await getUserFromCookies();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId, email } = await request.json();
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : typeof email === "string"
      ? await prisma.user.findUnique({
          where: { email: email.trim().toLowerCase() },
        })
      : null;
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const result = await generateInviteTokenServer(user.id);
  return result
    ? NextResponse.json({ success: true, ...result })
    : NextResponse.json({ error: "Failed to generate invite" }, { status: 500 });
}
