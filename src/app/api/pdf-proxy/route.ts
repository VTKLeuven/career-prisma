import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("fileId");
  if (!fileId) {
    return NextResponse.json(
      { error: "Missing fileId parameter" },
      { status: 400 }
    );
  }
  return NextResponse.redirect(
    new URL(`/api/files/${encodeURIComponent(fileId)}`, request.url)
  );
}
