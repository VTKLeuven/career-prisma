// app/api/event/[eventName]/company-guide/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchEventPagesAction } from "@/app/actions/events";
import { getDirectusImageUrl } from "@/components/Images";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventName: string }> }
) {
  try {
    const { eventName } = await params;
    
    // Fetch event pages to find the matching one
    const events = await fetchEventPagesAction();
    const eventPage = events.find(
      (p) =>
        p.event?.name &&
        p.event.name.toLowerCase().replace(/\s+/g, "-") === eventName
    );

    if (!eventPage || !eventPage.company_guide) {
      return NextResponse.json(
        { error: "Company guide not found" },
        { status: 404 }
      );
    }

    // Get file ID - handle both string ID and object with id property
    const companyGuide = eventPage.company_guide;
    const fileId = !companyGuide 
      ? null 
      : typeof companyGuide === 'string' 
        ? companyGuide 
        : (companyGuide as { id?: string })?.id || null

    if (!fileId) {
      return NextResponse.json(
        { error: "Company guide file not found" },
        { status: 404 }
      );
    }

    // Get Directus URL
    const directusUrl = getDirectusImageUrl(fileId);
    if (!directusUrl) {
      return NextResponse.json(
        { error: "Failed to get PDF URL" },
        { status: 500 }
      );
    }

    // Fetch PDF from Directus
    const response = await fetch(directusUrl, {
      method: "GET",
      headers: {
        Accept: "application/pdf",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const pdfBlob = await response.blob();

    // Return PDF with download headers
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="company-guide-${eventName}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error downloading company guide:", error);
    return NextResponse.json(
      { error: "Failed to download company guide" },
      { status: 500 }
    );
  }
}

