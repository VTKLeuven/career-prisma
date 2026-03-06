import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const params = await context.params;
    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 });
    }

    const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL;
    if (!directusUrl) {
      return NextResponse.json({ error: "Directus URL not configured" }, { status: 500 });
    }

    // Fetch file metadata from Directus REST API
    const filesUrl = `${directusUrl.replace(/\/$/, "")}/files/${fileId}?fields=type,filename_download`;
    const token = process.env.DIRECTUS_SERVER_TOKEN;
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      // Fallback: use user's auth token from cookie when server token not set
      const cookieStore = await cookies();
      const accessCookie = cookieStore.get(`${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`);
      if (accessCookie?.value) {
        headers["Authorization"] = `Bearer ${accessCookie.value}`;
      }
    }

    const response = await fetch(filesUrl, { headers });

    if (!response.ok) {
      return NextResponse.json(
        { error: "File not found" },
        { status: response.status }
      );
    }

    const result = await response.json();
    const data = result?.data ?? result;

    return NextResponse.json({
      type: data?.type ?? "application/octet-stream",
      filename: data?.filename_download ?? null,
    });
  } catch (error) {
    console.error("[files info API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch file info" },
      { status: 500 }
    );
  }
}
