import { NextRequest, NextResponse } from "next/server";
import { readItems } from "@directus/sdk";
import { getServerDirectusClient } from "@/lib/directus";

export const runtime = "nodejs";

/**
 * Public endpoint: returns a screen's schedule + media info.
 * Called by Raspberry Pi clients every ~60s.
 * Uses server token when available for proper permissions on signage collections.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const client = await getServerDirectusClient();

        // Find screen by slug
        const screens = await client.request(
            readItems("signage_screens" as any, {
                fields: ["*"],
                filter: { slug: { _eq: slug } },
                limit: 1,
            } as any)
        ) as any[];

        if (!screens || screens.length === 0) {
            return NextResponse.json({ error: "Screen not found" }, { status: 404 });
        }

        const screen = screens[0];

        // Fetch schedule slots with file (signage_media) expanded
        const slots = await client.request(
            readItems("signage_schedule_slots" as any, {
                fields: ["*", "file.id", "file.name", "file.type", "file.file.id", "file.file.type", "file.file.filename_download"],
                filter: { screen: { _eq: screen.id } },
                sort: ["start_time"],
                limit: -1,
            } as any)
        ) as any[];

        // Build response with direct media URLs (relative paths work for same-origin)
        const slotsWithUrls = (slots || []).map((slot: any) => {
            const file = slot.file;
            const fileId = file?.file?.id || (typeof file?.file === "string" ? file.file : null);
            return {
                id: slot.id,
                start_time: slot.start_time,
                end_time: slot.end_time,
                media: {
                    id: file?.id,
                    name: file?.name,
                    type: file?.type,
                    file_url: fileId ? `/api/signage/media/${fileId}` : null,
                },
            };
        });

        return NextResponse.json(
            {
                screen: { id: screen.id, name: screen.name, slug: screen.slug },
                slots: slotsWithUrls,
                _fetched_at: new Date().toISOString(),
            },
            {
                headers: {
                    // Short cache — viewer polls every 60s
                    "Cache-Control": "public, max-age=30, s-maxage=30",
                },
            }
        );
    } catch (error) {
        console.error("[signage screen] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch screen data" },
            { status: 500 }
        );
    }
}
