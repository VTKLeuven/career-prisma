"use server";

import { getUserFromCookies } from "@/lib/auth-server";
import { getDirectusWithToken, getAdminDirectusClient, directus } from "@/lib/directus";
import { createItem, readItems, updateItem, deleteItem } from "@directus/sdk";
import { revalidatePath } from "next/cache";
import type { SignageScreen, SignageMedia, SignageScheduleSlot } from "@/lib/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getClient() {
    return (await getDirectusWithToken()) ?? getAdminDirectusClient() ?? directus;
}

async function requireAdmin() {
    const user = await getUserFromCookies();
    if (!user?.admin) throw new Error("Unauthorized");
    return user;
}

function tryCoaxId(id: any) {
    if (typeof id === "string" && /^\d+$/.test(id)) {
        return parseInt(id, 10);
    }
    return id;
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

export async function fetchScreensAction(): Promise<SignageScreen[]> {
    const client = await getClient();
    return client.request(
        readItems("signage_screens", {
            fields: ["*"],
            sort: ["name"],
            limit: -1,
        })
    ) as unknown as SignageScreen[];
}

export async function createScreenAction(data: { name: string; slug: string }) {
    try {
        await requireAdmin();
        const client = await getClient();
        const created = await client.request(
            createItem("signage_screens", {
                ...data,
                slug: data.slug.trim(),
                status: "published"
            } as any)
        );
        revalidatePath("/admin/signage");
        revalidatePath("/screen");
        return { success: true, data: created };
    } catch (error) {
        console.error("[signage] createScreen error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to create screen" };
    }
}

export async function updateScreenAction(id: string, data: Partial<SignageScreen>) {
    try {
        await requireAdmin();
        const client = await getClient();
        await client.request(updateItem("signage_screens", id, data as any));
        revalidatePath("/admin/signage");
        revalidatePath("/screen");
        return { success: true };
    } catch (error) {
        console.error("[signage] updateScreen error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to update screen" };
    }
}

export async function deleteScreenAction(id: string) {
    try {
        await requireAdmin();
        const client = await getClient();
        // Delete associated schedule slots first
        const slots = await client.request(
            readItems("signage_schedule_slots", {
                fields: ["id"],
                filter: { screen: { _eq: id } } as any,
                limit: -1,
            })
        ) as any[];
        for (const slot of slots) {
            await client.request(deleteItem("signage_schedule_slots", slot.id));
        }
        await client.request(deleteItem("signage_screens", id));
        revalidatePath("/admin/signage");
        revalidatePath("/screen");
        return { success: true };
    } catch (error) {
        console.error("[signage] deleteScreen error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to delete screen" };
    }
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export async function fetchMediaAction(): Promise<SignageMedia[]> {
    const client = await getClient();
    const result = await client.request(
        readItems("signage_media", {
            fields: ["*", "file.id", "file.filename_download", "file.type"] as any,
            sort: ["-id"] as any,
            limit: -1,
        })
    ) as unknown as SignageMedia[];
    return result;
}

export async function createMediaAction(data: {
    name: string;
    type: "pdf" | "video" | "image";
    file: string; // Directus file ID
}) {
    try {
        await requireAdmin();
        const client = await getClient();
        const created = await client.request(
            createItem("signage_media", {
                ...data,
                file: data.file, // This is a UUID, keep as string
            } as any)
        );
        revalidatePath("/admin/signage");
        return { success: true, data: created };
    } catch (error) {
        console.error("[signage] createMedia error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to create media" };
    }
}

export async function deleteMediaAction(id: string) {
    try {
        await requireAdmin();
        const client = await getClient();
        // Remove schedule slots referencing this media first
        const slots = await client.request(
            readItems("signage_schedule_slots", {
                fields: ["id"],
                filter: { file: { _eq: id } } as any,
                limit: -1,
            })
        ) as any[];
        for (const slot of slots) {
            await client.request(deleteItem("signage_schedule_slots", slot.id));
        }
        // Delete the media record (the Directus file stays in storage)
        await client.request(deleteItem("signage_media", id));
        revalidatePath("/admin/signage");
        return { success: true };
    } catch (error) {
        console.error("[signage] deleteMedia error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to delete media" };
    }
}

// ---------------------------------------------------------------------------
// Schedule Slots
// ---------------------------------------------------------------------------

export async function fetchScheduleSlotsAction(screenId: string): Promise<SignageScheduleSlot[]> {
    const client = await getClient();
    const coercedScreenId = tryCoaxId(screenId);
    const result = await client.request(
        readItems("signage_schedule_slots", {
            fields: ["*", "file.id", "file.name", "file.type", "file.file.id", "file.file.filename_download", "file.file.type"] as any,
            filter: { screen: { _eq: coercedScreenId } } as any,
            sort: ["start_time"],
            limit: -1,
        })
    ) as unknown as SignageScheduleSlot[];
    return result;
}

export async function createScheduleSlotAction(data: {
    screen: string;
    media: string;
    start_time: string;
    end_time: string;
}) {
    try {
        await requireAdmin();
        const client = await getClient();
        const created = await client.request(
            createItem("signage_schedule_slots", {
                screen: tryCoaxId(data.screen),
                file: tryCoaxId(data.media),
                start_time: data.start_time,
                end_time: data.end_time,
            } as any)
        );
        revalidatePath("/admin/signage");
        return { success: true, data: created };
    } catch (error) {
        console.error("[signage] createSlot error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to create slot" };
    }
}

export async function updateScheduleSlotAction(
    id: string,
    data: Partial<{ media: string; start_time: string; end_time: string }>
) {
    try {
        await requireAdmin();
        const client = await getClient();
        const updatePayload: Record<string, unknown> = {};
        if (data.start_time != null) updatePayload.start_time = data.start_time;
        if (data.end_time != null) updatePayload.end_time = data.end_time;
        if (data.media != null) updatePayload.file = tryCoaxId(data.media);
        await client.request(updateItem("signage_schedule_slots", id, updatePayload as any));
        revalidatePath("/admin/signage");
        return { success: true };
    } catch (error) {
        console.error("[signage] updateSlot error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to update slot" };
    }
}

export async function deleteScheduleSlotAction(id: string) {
    try {
        await requireAdmin();
        const client = await getClient();
        await client.request(deleteItem("signage_schedule_slots", id));
        revalidatePath("/admin/signage");
        return { success: true };
    } catch (error) {
        console.error("[signage] deleteSlot error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to delete slot" };
    }
}

// ---------------------------------------------------------------------------
// Public: fetch screen by slug (no admin required)
// ---------------------------------------------------------------------------

export async function fetchScreenBySlugAction(slug: string) {
    try {
        const client = await getClient();
        const screens = await client.request(
            readItems("signage_screens", {
                fields: ["*"],
                filter: { slug: { _eq: slug.trim() } } as any,
                limit: 1,
            })
        ) as unknown as SignageScreen[];

        if (!screens || screens.length === 0) return null;
        const screen = screens[0];

        const slots = await client.request(
            readItems("signage_schedule_slots", {
                fields: ["*", "file.id", "file.name", "file.type", "file.file.id", "file.file.filename_download", "file.file.type"] as any,
                filter: { screen: { _eq: screen.id } } as any,
                sort: ["start_time"],
                limit: -1,
            })
        ) as unknown as SignageScheduleSlot[];

        return { screen, slots };
    } catch (error) {
        console.error("[signage] fetchScreenBySlug error:", error);
        return null;
    }
}
