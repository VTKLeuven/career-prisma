import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

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
    // 1. Find all form_versions linked to this event.
    //    metadata is a JSON column; Directus may not support nested JSON filters on all DBs,
    //    so we fetch all versions and filter in JS as a fallback.
    const formVersions = await prisma.formVersion.findMany({
      where: { metadata: { path: ["event_id"], equals: eventId } },
      select: { id: true },
    });

    const versionIds = formVersions.map((v) => v.id);

    // 2. Get all registered attendants (form_responses with attendant_uuid for these versions)
    const registeredResponses = versionIds.length
      ? await prisma.formResponse.findMany({
          where: {
            form_version_id: { in: versionIds },
            archived: { not: true },
            attendant_uuid: { not: null },
          },
          select: { id: true, attendant_uuid: true, data: true },
        })
      : [];

    const totalRegistered = registeredResponses.length;

    // Build a lookup from barcode (no hyphens) to attendant info
    const barcodeToAttendant = new Map<string, { name: string }>();
    for (const r of registeredResponses) {
      if (!r.attendant_uuid) continue;
      const barcode = r.attendant_uuid.replace(/-/g, "");
      const data = r.data as Record<string, unknown>;
      const firstName = (data?.firstname as string) || (data?.first_name as string) || "";
      const lastName = (data?.lastname as string) || (data?.last_name as string) || "";
      barcodeToAttendant.set(barcode, { name: `${firstName} ${lastName}`.trim() || "Unknown" });
    }

    // 3. Get all check-ins for this event.
    //    The event_checkins collection may not exist yet -- return empty in that case.
    const checkins = await prisma.eventCheckin.findMany({
      where: { event_id: eventId },
      orderBy: { checked_in_at: "asc" },
    });

    const totalCheckedIn = checkins.length;

    // 4. Build time-series data (15-minute buckets)
    const timeBuckets = new Map<string, number>();
    let cumulative = 0;

    for (const c of checkins) {
      if (!c.checked_in_at) continue;
      const d = new Date(c.checked_in_at);
      d.setMinutes(Math.floor(d.getMinutes() / 15) * 15, 0, 0);
      const key = d.toISOString();
      timeBuckets.set(key, (timeBuckets.get(key) || 0) + 1);
    }

    const sortedBuckets = [...timeBuckets.entries()].sort(([a], [b]) => a.localeCompare(b));
    const timeSeries = sortedBuckets.map(([time, count]) => {
      cumulative += count;
      return { time, count, cumulative };
    });

    // 5. Recent check-ins (last 20)
    const recentCheckins = checkins
      .slice(-20)
      .reverse()
      .map((c) => ({
        barcode: c.barcode,
        checked_in_at: c.checked_in_at?.toISOString(),
        name: barcodeToAttendant.get(c.barcode || "")?.name || "Unknown",
      }));

    return NextResponse.json({
      totalRegistered,
      totalCheckedIn,
      remaining: totalRegistered - totalCheckedIn,
      timeSeries,
      recentCheckins,
    });
  } catch (error) {
    console.error("[admin/checkins] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to load check-in data", details: String(error) },
      { status: 500 },
    );
  }
}
