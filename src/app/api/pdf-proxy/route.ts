// app/api/pdf-proxy/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "Missing fileId parameter" }, { status: 400 });
  }

  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "https://directustest.vtk.be/";
  const pdfUrl = `${directusUrl}assets/${fileId}`;

  try {
    const response = await fetch(pdfUrl, {
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

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="company-guide.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error proxying PDF:", error);
    return NextResponse.json(
      { error: "Failed to proxy PDF" },
      { status: 500 }
    );
  }
}

