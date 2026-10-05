import { NextRequest, NextResponse } from "next/server";
import { recordCheckins } from "@/lib/repos/checkins";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateBarcode(barcode: unknown): barcode is string {
  return typeof barcode === "string" && /^[0-9a-fA-F]{32}$/.test(barcode.replace(/-/g, ""));
}

function validateTimestamp(ts: unknown): ts is string {
  if (typeof ts !== "string") return false;
  const d = new Date(ts);
  return !isNaN(d.getTime());
}

type CheckinEntry = { barcode: string; checked_in_at: string };

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("X-API-Key");
  const expectedKey = process.env.CHECKIN_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = request.nextUrl.searchParams.get("event_id");
  if (!eventId || !UUID_RE.test(eventId)) {
    return NextResponse.json(
      { error: "event_id query parameter is required (UUID format)" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const entries: CheckinEntry[] = [];
  if (Array.isArray(body)) {
    for (const item of body) {
      if (!validateBarcode(item?.barcode) || !validateTimestamp(item?.checked_in_at)) {
        return NextResponse.json(
          { error: `Invalid entry: barcode and checked_in_at (ISO 8601) are required`, invalid: item },
          { status: 400 },
        );
      }
      entries.push({ barcode: item.barcode.replace(/-/g, ""), checked_in_at: item.checked_in_at });
    }
  } else if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (!validateBarcode(obj.barcode) || !validateTimestamp(obj.checked_in_at)) {
      return NextResponse.json(
        { error: "barcode (32 hex chars) and checked_in_at (ISO 8601) are required" },
        { status: 400 },
      );
    }
    entries.push({ barcode: (obj.barcode as string).replace(/-/g, ""), checked_in_at: obj.checked_in_at as string });
  } else {
    return NextResponse.json({ error: "Body must be a JSON object or array" }, { status: 400 });
  }

  const results = await recordCheckins(eventId, entries);

  return NextResponse.json({ results });
}
