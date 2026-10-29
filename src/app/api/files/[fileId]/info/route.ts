import { NextResponse } from "next/server";
import { getFileRecord } from "@/lib/repos/files";
import { canReadFile } from "@/lib/file-access";

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;
  const file = await getFileRecord(fileId);
  // The download name of a CV is usually the student's own name.
  if (!file || !(await canReadFile(file))) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  return NextResponse.json({
    type: file.type || "application/octet-stream",
    filename: file.filename_download,
  });
}
