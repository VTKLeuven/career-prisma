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
  return NextResponse.redirect(
    new URL(`/api/files/${encodeURIComponent(fileId)}`, request.url)
  );
}
