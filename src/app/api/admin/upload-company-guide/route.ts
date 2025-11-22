// app/api/admin/upload-company-guide/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { uploadDirectusFile } from "@/lib/repos/directus";
import { getOrCreateEventPage } from "@/lib/repos/floorplan";
import { getDirectusWithToken } from "@/lib/directus";
import { updateItem } from "@directus/sdk";

// Allow larger file uploads (up to 50MB)
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE)?.value;

    if (!token) {
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

    // Step 2: Upload PDF file to Directus
    // Pass the file directly - uploadDirectusFile will handle it correctly
    // This matches the pattern used in upload-floorplan route
    const pdfFileId = await uploadDirectusFile(pdfFile);

    if (!pdfFileId) {
      return NextResponse.json(
        { error: "Failed to upload PDF file" },
        { status: 500 }
      );
    }

    // Step 3: Update event page with company guide
    const client = await getDirectusWithToken();
    if (!client) {
      return NextResponse.json(
        { error: "Failed to get Directus client" },
        { status: 500 }
      );
    }

    await client.request(
      updateItem("career_event_page", eventPage.id, {
        company_guide: pdfFileId,
      })
    );

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
