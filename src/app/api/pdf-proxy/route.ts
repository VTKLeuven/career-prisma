import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("fileId");
  if (!fileId) {
    return NextResponse.json(
      { error: "Missing fileId parameter" },
      { status: 400 }
    );
  }
  // Relative Location on purpose: in the standalone container request.url
  // can carry the internal listener origin (http://0.0.0.0:3000), and an
  // absolute redirect built from it sends browsers there. See api/cv-file.
  return new NextResponse(null, {
    status: 307,
    headers: { Location: `/api/files/${encodeURIComponent(fileId)}` },
  });
}
