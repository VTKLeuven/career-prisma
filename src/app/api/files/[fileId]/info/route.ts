import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: { type: true, filename_download: true },
  });
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  return NextResponse.json({
    type: file.type || "application/octet-stream",
    filename: file.filename_download,
  });
}
