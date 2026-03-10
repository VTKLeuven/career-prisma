import { NextRequest, NextResponse } from "next/server";
import { getAdminDirectusClient } from "@/lib/directus";
import { readItems, createItem } from "@directus/sdk";

const EVENT_ID = "4a1b38c1-83f4-418e-b4c3-9e1ec680f832";

function barcodeToUuid(barcode: string): string {
  const h = barcode.replace(/-/g, "").toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

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

  const client = getAdminDirectusClient();
  if (!client) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const results: { barcode: string; status: string }[] = [];

  for (const entry of entries) {
    const uuid = barcodeToUuid(entry.barcode);

    const responses = (await client.request(
      readItems("form_responses" as any, {
        fields: ["id"],
        filter: { attendant_uuid: { _eq: uuid } },
        limit: 1,
      })
    )) as unknown as Array<{ id: string }>;

    if (responses.length === 0) {
      results.push({ barcode: entry.barcode, status: "not_found" });
      continue;
    }

    const existing = (await client.request(
      readItems("event_checkins" as any, {
        fields: ["id"],
        filter: {
          barcode: { _eq: entry.barcode },
          event_id: { _eq: EVENT_ID },
        },
        limit: 1,
      })
    )) as unknown as Array<{ id: string }>;

    if (existing.length > 0) {
      results.push({ barcode: entry.barcode, status: "already_checked_in" });
      continue;
    }

    await client.request(
      createItem("event_checkins" as any, {
        barcode: entry.barcode,
        event_id: EVENT_ID,
        checked_in_at: new Date(entry.checked_in_at).toISOString(),
      })
    );

    results.push({ barcode: entry.barcode, status: "checked_in" });
  }

  return NextResponse.json({ results });
}
