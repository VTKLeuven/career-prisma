import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { getAdminDirectusClient } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import type { FormVersion, FormResponse, EventCheckin } from "@/lib/schema";

export async function GET(request: NextRequest) {
  const user = await getUserFromCookies();
  if (!user?.admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = request.nextUrl.searchParams.get("event_id");
  if (!eventId) {
    return NextResponse.json({ error: "event_id query parameter is required" }, { status: 400 });
  }

  const client = getAdminDirectusClient();
  if (!client) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    // 1. Find all form_versions linked to this event.
    //    metadata is a JSON column; Directus may not support nested JSON filters on all DBs,
    //    so we fetch all versions and filter in JS as a fallback.
    let formVersions: FormVersion[] = [];
    try {
      formVersions = (await client.request(
        readItems("form_versions" as any, {
          fields: ["id", "metadata"],
          filter: { metadata: { event_id: { _eq: eventId } } } as any,
          limit: -1,
        })
      )) as unknown as FormVersion[];
    } catch {
      // Fallback: fetch all and filter client-side
      const allVersions = (await client.request(
        readItems("form_versions" as any, {
          fields: ["id", "metadata"],
          limit: -1,
        })
      )) as unknown as FormVersion[];
      formVersions = allVersions.filter(
        (v) => v.metadata && typeof v.metadata === "object" && v.metadata.event_id === eventId
      );
    }

    const versionIds = formVersions.map((v) => v.id);

    // 2. Get all registered attendants (form_responses with attendant_uuid for these versions)
    let registeredResponses: Pick<FormResponse, "id" | "attendant_uuid" | "data">[] = [];
    if (versionIds.length > 0) {
      registeredResponses = (await client.request(
        readItems("form_responses" as any, {
          fields: ["id", "attendant_uuid", "data"],
          filter: {
            form_version_id: { _in: versionIds },
            archived: { _neq: true },
            attendant_uuid: { _nnull: true },
          },
          limit: -1,
        })
      )) as unknown as typeof registeredResponses;
    }

    const totalRegistered = registeredResponses.length;

    // Build a lookup from barcode (no hyphens) to attendant info
    const barcodeToAttendant = new Map<string, { name: string }>();
    for (const r of registeredResponses) {
      if (!r.attendant_uuid) continue;
      const barcode = r.attendant_uuid.replace(/-/g, "");
      const firstName = (r.data?.firstname as string) || (r.data?.first_name as string) || "";
      const lastName = (r.data?.lastname as string) || (r.data?.last_name as string) || "";
      barcodeToAttendant.set(barcode, { name: `${firstName} ${lastName}`.trim() || "Unknown" });
    }

    // 3. Get all check-ins for this event.
    //    The event_checkins collection may not exist yet -- return empty in that case.
    let checkins: EventCheckin[] = [];
    try {
      checkins = (await client.request(
        readItems("event_checkins" as any, {
          fields: ["id", "barcode", "checked_in_at"],
          filter: { event_id: { _eq: eventId } },
          sort: "checked_in_at",
          limit: -1,
        })
      )) as unknown as EventCheckin[];
    } catch (e) {
      console.warn("[admin/checkins] Could not query event_checkins (collection may not exist yet):", e);
      checkins = [];
    }

    const totalCheckedIn = checkins.length;

    // 4. Build time-series data (15-minute buckets)
    const timeBuckets = new Map<string, number>();
    let cumulative = 0;

    for (const c of checkins) {
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
        checked_in_at: c.checked_in_at,
        name: barcodeToAttendant.get(c.barcode)?.name || "Unknown",
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
