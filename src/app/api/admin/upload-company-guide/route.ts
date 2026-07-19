// app/api/admin/upload-company-guide/route.ts
import { NextResponse } from "next/server";
import { uploadFile } from "@/lib/file-storage";
import { getOrCreateEventPage } from "@/lib/repos/floorplan";
import { getUserFromCookies } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

// Allow larger file uploads (up to 50MB)
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const user = await getUserFromCookies();
    if (!user?.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const pdfFile = formData.get("pdf") as File | null;
    const eventId = formData.get("eventId") as string | null;

    if (!pdfFile || !eventId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (pdfFile.type !== "application/pdf" && !pdfFile.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    // Step 1: Get or create event page for this event
    const eventPage = await getOrCreateEventPage(eventId);
    if (!eventPage) {
      return NextResponse.json(
        { error: "Failed to get or create event page" },
        { status: 500 }
      );
    }

    // Step 2: Store the PDF.
    const pdfFileId = await uploadFile(pdfFile);

    if (!pdfFileId) {
      return NextResponse.json(
        { error: "Failed to upload PDF file" },
        { status: 500 }
      );
    }

    // Step 3: Update event page with company guide
    await prisma.careerEventPage.update({
      where: { id: Number(eventPage.id) },
      data: { company_guide: pdfFileId },
    });

    return NextResponse.json({
      success: true,
      message: "Company guide uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading company guide:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
