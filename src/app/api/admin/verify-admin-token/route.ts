import { NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

export async function GET() {
  const user = await getUserFromCookies();
  if (!user?.admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({
    success: true,
    checks: {
      sessionValid: true,
      administrator: true,
      databaseReachable: true,
    },
    user: { id: user.id, email: user.email, role: user.role },
  });
}
