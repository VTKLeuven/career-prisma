import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const directusUrl = process.env.DIRECTUS_URL?.replace(/\/$/, '') || '';
    if (!directusUrl) {
      return NextResponse.json({ error: "Directus URL not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const width = searchParams.get('w');
    const quality = searchParams.get('q');
    const format = searchParams.get('format');

    let fileUrl = `${directusUrl}/assets/${fileId}`;
    const transformParams = new URLSearchParams();
    if (width) transformParams.set('width', width);
    if (quality) transformParams.set('quality', quality);
    if (format) transformParams.set('format', format);
    const isThumbnail = transformParams.size > 0;
    if (isThumbnail) {
      fileUrl += `?${transformParams.toString()}`;
    }

    const fileResponse = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: "File not found" },
        { status: fileResponse.status }
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const contentType = fileResponse.headers.get("content-type") || "application/pdf";
    const cacheMaxAge = isThumbnail ? 86400 : 3600;

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        ...(!isThumbnail && { "Content-Disposition": `inline; filename="${fileId}.pdf"` }),
        "Cache-Control": `public, max-age=${cacheMaxAge}`,
      },
    });
  } catch (error) {
    console.error("[cv-file] Error fetching file:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}
