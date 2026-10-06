import { NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { pingDatabase } from "@/lib/repos/system-logs";

export async function GET() {
  const user = await getUserFromCookies();
  if (!user?.admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await pingDatabase();
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
