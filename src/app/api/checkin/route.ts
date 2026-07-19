import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const results: { barcode: string; status: string }[] = [];

  for (const entry of entries) {
    const uuid = barcodeToUuid(entry.barcode);

    const response = await prisma.formResponse.findFirst({
      where: { attendant_uuid: uuid, archived: { not: true } },
      select: { id: true },
    });
    if (!response) {
      results.push({ barcode: entry.barcode, status: "not_found" });
      continue;
    }

    const existing = await prisma.eventCheckin.findFirst({
      where: { barcode: entry.barcode, event_id: eventId },
    });
    if (existing) {
      results.push({ barcode: entry.barcode, status: "already_checked_in" });
      continue;
    }

    await prisma.eventCheckin.create({
      data: {
        barcode: entry.barcode,
        event_id: eventId,
        checked_in_at: new Date(entry.checked_in_at),
      },
    });

    results.push({ barcode: entry.barcode, status: "checked_in" });
  }

  return NextResponse.json({ results });
}
