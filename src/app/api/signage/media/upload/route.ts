import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get("content-type") || "";
        if (!contentType.includes("multipart/form-data")) {
            return NextResponse.json({ error: "Content-Type must be multipart/form-data" }, { status: 400 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const name = formData.get("name") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Determine media type from MIME
        let mediaType: "pdf" | "video" | "image" = "image";
        if (file.type === "application/pdf") mediaType = "pdf";
        else if (file.type.startsWith("video/")) mediaType = "video";
        else if (file.type.startsWith("image/")) mediaType = "image";

        const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL;
        if (!directusUrl) {
            return NextResponse.json({ error: "Directus URL not configured" }, { status: 500 });
        }

        // Auth token
        let token: string | undefined;
        try {
            const cookieStore = await cookies();
            const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
            token = cookieStore.get(ACCESS_COOKIE)?.value;
        } catch {
            // Continue without token
        }

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Upload file to Directus
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);

        const uploadUrl = `${directusUrl.replace(/\/$/, "")}/files`;
        const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: uploadFormData,
        });

        if (!uploadResponse.ok) {
            const errText = await uploadResponse.text().catch(() => "Upload failed");
            return NextResponse.json({ error: `Directus upload failed: ${errText}` }, { status: 502 });
        }

        const uploadResult = await uploadResponse.json();
        const fileId = uploadResult?.data?.id || uploadResult?.id;
        if (!fileId) {
            return NextResponse.json({ error: "Failed to extract file ID" }, { status: 500 });
        }

        // Create signage_media record
        const mediaUrl = `${directusUrl.replace(/\/$/, "")}/items/signage_media`;
        const mediaResponse = await fetch(mediaUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: name || file.name.replace(/\.[^.]+$/, ""),
                type: mediaType,
                file: fileId,
            }),
        });

        if (!mediaResponse.ok) {
            const errText = await mediaResponse.text().catch(() => "Create media failed");
            return NextResponse.json({ error: `Failed to create media: ${errText}` }, { status: 502 });
        }

        const mediaResult = await mediaResponse.json();
        const mediaId = mediaResult?.data?.id || mediaResult?.id;

        return NextResponse.json({ id: mediaId, fileId, type: mediaType });
    } catch (error) {
        console.error("[signage media upload] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Upload failed" },
            { status: 500 }
        );
    }
}
