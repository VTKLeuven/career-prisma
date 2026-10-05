import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { getCheckinStats } from "@/lib/repos/checkins";

export async function GET(request: NextRequest) {
  const user = await getUserFromCookies();
  if (!user?.admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = request.nextUrl.searchParams.get("event_id");
  if (!eventId) {
    return NextResponse.json({ error: "event_id query parameter is required" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getCheckinStats(eventId));
  } catch (error) {
    console.error("[admin/checkins] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to load check-in data", details: String(error) },
      { status: 500 },
    );
  }
}
