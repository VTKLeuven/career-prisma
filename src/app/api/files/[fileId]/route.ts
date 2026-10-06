import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { createGzip } from "zlib";
import { NextResponse } from "next/server";
import { getStoredFile } from "@/lib/file-storage";

export const runtime = "nodejs";

// Uploads are served from this site's own origin, so a script-capable file
// opened directly -- an SVG or HTML upload -- would run as career.vtk.be. Those
// types get a CSP that sandboxes them and blocks scripts; embedding them as
// images (<img>, the floorplan's <image>) is unaffected. PDFs are deliberately
// not sandboxed: browsers refuse to render a PDF in a sandboxed document, and
// the CV and company-guide viewers frame them.
const SCRIPTABLE_TYPE = /^\s*(image\/svg\+xml|text\/html|application\/xhtml\+xml|text\/xml|application\/xml)\b/i;
const SANDBOX_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox";

// Text formats shrink several-fold when gzipped -- the jobfair floorplan SVG
// from 610 KB to 114 KB -- and Next does not compress a streamed route
// response. Images, PDFs and video are already compressed.
const COMPRESSIBLE_TYPE = /^\s*(image\/svg\+xml|text\/|application\/(json|xml|javascript))/i;

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
    const contentLength = end - start + 1;
    const contentType = stored.metadata.type || "application/octet-stream";
    // Whole-file requests only: a byte range refers to the uncompressed file.
    const gzip =
      status === 200 &&
      COMPRESSIBLE_TYPE.test(contentType) &&
      /\bgzip\b/i.test(request.headers.get("accept-encoding") ?? "");
    const fileStream = createReadStream(stored.filePath, { start, end });
    const stream = Readable.toWeb(gzip ? fileStream.pipe(createGzip()) : fileStream);
    return new NextResponse(stream as BodyInit, {
      status,
      headers: {
        "Content-Type": contentType,
        // The stored type is whatever the uploader's browser declared; never
        // let a browser second-guess it into something executable.
        "X-Content-Type-Options": "nosniff",
        ...(SCRIPTABLE_TYPE.test(contentType) && {
          "Content-Security-Policy": SANDBOX_CSP,
        }),
        ...(gzip ? { "Content-Encoding": "gzip" } : { "Content-Length": String(contentLength) }),
        // So a shared cache keeps the gzipped and plain copies apart.
        ...(COMPRESSIBLE_TYPE.test(contentType) && { Vary: "Accept-Encoding" }),
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
