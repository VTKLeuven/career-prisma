// app/api/event/[eventName]/company-guide/download/route.ts
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { loadEventPage } from "@/lib/event-page-data";
import { getStoredFile } from "@/lib/file-storage";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

/**
 * The event's company guide as a PDF download. Looks the event page up through
 * the event-page cache and streams the file from storage -- it used to load the
 * fifty newest event pages in full and then fetch its own /api/files URL.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventName: string }> }
) {
  try {
    const { eventName } = await params;

    const eventPage = await loadEventPage(eventName);
    const companyGuide = eventPage?.company_guide;
    // The guide is a file id, or an object carrying one.
    const fileId = !companyGuide
      ? null
      : typeof companyGuide === 'string'
        ? companyGuide
        : (companyGuide as { id?: string })?.id || null;

    if (!fileId) {
      return NextResponse.json(
        { error: "Company guide not found" },
        { status: 404 }
      );
    }

    const stored = await getStoredFile(fileId);
    if (!stored) {
      return NextResponse.json(
        { error: "Company guide file not found" },
        { status: 404 }
      );
    }
    const { size } = await stat(stored.filePath);

    // Return PDF with download headers
    return new NextResponse(Readable.toWeb(createReadStream(stored.filePath)) as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(size),
        "Content-Disposition": `attachment; filename="company-guide-${eventName.replace(/[^a-z0-9-]/gi, "_")}.pdf"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return NextResponse.json({ error: "Company guide file not found" }, { status: 404 });
    }
    console.error("Error downloading company guide:", error);
    return NextResponse.json(
      { error: "Failed to download company guide" },
      { status: 500 }
    );
  }
}
