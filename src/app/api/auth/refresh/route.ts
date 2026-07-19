import { NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";

export async function POST() {
  const user = await getUserFromCookies();
  return user
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: "Session expired" }, { status: 401 });
}
