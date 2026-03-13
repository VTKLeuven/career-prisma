import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Proxy media files from Directus with aggressive caching.
 * Public — no auth required so Raspberry Pi screens can fetch media.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL;
        if (!directusUrl) {
            return NextResponse.json({ error: "Directus URL not configured" }, { status: 500 });
        }

        // Use server token for file access (public proxy)
        const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
        const headers: HeadersInit = {};
        if (serverToken) {
            headers["Authorization"] = `Bearer ${serverToken}`;
        }

        const fileUrl = `${directusUrl.replace(/\/$/, "")}/assets/${id}`;
        const response = await fetch(fileUrl, { headers });

        if (!response.ok) {
            return new NextResponse("File not found", { status: 404 });
        }

        const contentType = response.headers.get("content-type") || "application/octet-stream";
        const body = response.body;

        return new NextResponse(body, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                // Aggressive caching for offline support — 7 days, immutable
                "Cache-Control": "public, max-age=604800, immutable",
            },
        });
    } catch (error) {
        console.error("[signage media proxy] Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
