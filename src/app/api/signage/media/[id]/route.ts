import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Relative Location on purpose: in the standalone container request.url
  // can carry the internal listener origin (http://0.0.0.0:3000), and an
  // absolute redirect built from it sends browsers there. See api/cv-file.
  return new NextResponse(null, {
    status: 307,
    headers: { Location: `/api/files/${encodeURIComponent(id)}` },
  });
}
