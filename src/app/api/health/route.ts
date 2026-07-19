import { NextResponse } from "next/server";

/**
 * Lightweight health check for container and uptime monitoring.
 * Returns 200 immediately without hitting PostgreSQL or doing heavy work.
 */
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
