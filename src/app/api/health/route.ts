import { NextResponse } from "next/server";

/**
 * Lightweight health check for load balancers (Caddy).
 * Returns 200 immediately without hitting Directus or doing heavy work.
 */
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
