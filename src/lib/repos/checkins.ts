// lib/repos/checkins.ts -- event entrance check-ins (barcodes scanned at the door).
import "server-only";

import prisma from "@/lib/prisma";

/** A registration's attendant uuid as printed in its barcode: 32 hex digits, no hyphens. */
function uuidToBarcode(uuid: string): string {
  return uuid.replace(/-/g, "").toLowerCase();
}

function barcodeToUuid(barcode: string): string {
  const h = barcode.replace(/-/g, "").toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export type CheckinResult = { barcode: string; status: "checked_in" | "already_checked_in" | "not_found" };

/**
 * Records a batch of scans for an event. A barcode must belong to a live
 * registration; one already checked in for the event (earlier, or earlier in
 * this batch) is reported, not duplicated. Three queries for the whole batch
 * -- the scanner app uploads them in bulk -- instead of three per barcode.
 */
export async function recordCheckins(
  eventId: string,
  entries: Array<{ barcode: string; checked_in_at: string }>
): Promise<CheckinResult[]> {
  if (entries.length === 0) return [];
  const barcodes = entries.map((e) => e.barcode);

  const [registered, existing] = await Promise.all([
    prisma.formResponse.findMany({
      where: { attendant_uuid: { in: barcodes.map(barcodeToUuid) }, archived: { not: true } },
      select: { attendant_uuid: true },
    }),
    prisma.eventCheckin.findMany({
      where: { event_id: eventId, barcode: { in: barcodes } },
      select: { barcode: true },
    }),
  ]);

  const known = new Set(registered.map((r) => uuidToBarcode(r.attendant_uuid ?? "")));
  const checkedIn = new Set(existing.map((c) => c.barcode));
  const results: CheckinResult[] = [];
  const toCreate: Array<{ barcode: string; event_id: string; checked_in_at: Date }> = [];

  for (const entry of entries) {
    if (!known.has(entry.barcode.toLowerCase())) {
      results.push({ barcode: entry.barcode, status: "not_found" });
    } else if (checkedIn.has(entry.barcode)) {
      results.push({ barcode: entry.barcode, status: "already_checked_in" });
    } else {
      checkedIn.add(entry.barcode);
      toCreate.push({ barcode: entry.barcode, event_id: eventId, checked_in_at: new Date(entry.checked_in_at) });
      results.push({ barcode: entry.barcode, status: "checked_in" });
    }
  }

  if (toCreate.length > 0) await prisma.eventCheckin.createMany({ data: toCreate });
  return results;
}

/** Registrations, check-ins over time (15-minute buckets) and the latest scans for an event. */
export async function getCheckinStats(eventId: string) {
  // 1. Find all form_versions linked to this event.
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

  return {
    totalRegistered,
    totalCheckedIn,
    remaining: totalRegistered - totalCheckedIn,
    timeSeries,
    recentCheckins,
  };
}
