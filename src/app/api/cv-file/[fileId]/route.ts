import { NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { getStudentFromCookies } from "@/lib/auth-student";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const [user, student] = await Promise.all([
    getUserFromCookies(),
    getStudentFromCookies(),
  ]);
  if (!user && !student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { fileId } = await params;
  // In a standalone Next.js container, request.url can use the internal
  // listener origin (http://0.0.0.0:3000). An absolute redirect built from it
  // sends browsers to the container address instead of the public host.
  // Location accepts a relative reference, which keeps the browser's origin
  // and also works correctly behind a reverse proxy.
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: `/api/files/${encodeURIComponent(fileId)}`,
    },
  });
}
