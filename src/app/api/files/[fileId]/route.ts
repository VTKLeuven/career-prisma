import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { getStoredFile } from "@/lib/file-storage";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await context.params;
    const stored = await getStoredFile(fileId);
    if (!stored) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileStat = await stat(stored.filePath);
    const filename = stored.metadata.filename_download.replace(/["\r\n]/g, "_");
    const range = request.headers.get("range");
    let start = 0;
    let end = fileStat.size - 1;
    let status = 200;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (!match) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileStat.size}` },
        });
      }
      if (match[1]) start = Number(match[1]);
      if (match[2]) end = Number(match[2]);
      if (!match[1] && match[2]) {
        const suffixLength = Number(match[2]);
        start = Math.max(0, fileStat.size - suffixLength);
        end = fileStat.size - 1;
      }
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        end < start ||
        start >= fileStat.size
      ) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileStat.size}` },
        });
      }
      end = Math.min(end, fileStat.size - 1);
      status = 206;
    }
    const stream = Readable.toWeb(
      createReadStream(stored.filePath, { start, end })
    );
    const contentLength = end - start + 1;
    return new NextResponse(stream as BodyInit, {
      status,
      headers: {
        "Content-Type":
          stored.metadata.type || "application/octet-stream",
        "Content-Length": String(contentLength),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Accept-Ranges": "bytes",
        ...(status === 206 && {
          "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
        }),
      },
    });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    console.error("[files API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}
