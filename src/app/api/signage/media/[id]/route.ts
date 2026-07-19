import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.redirect(
    new URL(`/api/files/${encodeURIComponent(id)}`, request.url)
  );
}
