"use server";

import { readItems, createItem, updateItem } from "@directus/sdk";
import { getAdminDirectusClient } from "@/lib/directus";

/**
 * Collection: ordering_settings
 * Create in Directus Admin: Settings → Data Model → Create Collection
 * - Name: ordering_settings
 * - Fields: company_ordering_enabled (boolean, default: false)
 * Optional: Set as Singleton for a single settings row.
 */
const COLLECTION = "ordering_settings";

/** Get whether company reps can see the Ordering tab in their dashboard and the active event */
export async function getOrderingSettings(): Promise<{ enabled: boolean, activeEventId: string | null }> {
    try {
        const client = await getAdminDirectusClient();
        if (!client) return { enabled: false, activeEventId: null };

        const rows = await client.request(
            readItems(COLLECTION, {
                fields: ["company_ordering_enabled", "active_event_id"],
                limit: 1,
            })
        ) as { company_ordering_enabled?: boolean, active_event_id?: string }[];

        return {
            enabled: rows[0]?.company_ordering_enabled ?? false,
            activeEventId: rows[0]?.active_event_id ?? null,
        };
    } catch {
        return { enabled: false, activeEventId: null };
    }
}

/** Set whether company reps can see the Ordering tab and the active event */
export async function setOrderingSettings(enabled: boolean, activeEventId: string | null): Promise<boolean> {
    try {
        const client = await getAdminDirectusClient();
        if (!client) return false;

        const existing = await client.request(
            readItems(COLLECTION, { fields: ["id"], limit: 1 })
        ) as { id: string }[];

        const payload = {
            company_ordering_enabled: enabled,
            active_event_id: activeEventId,
        };

        if (existing.length > 0) {
            await client.request(
                updateItem(COLLECTION, existing[0].id, payload)
            );
        } else {
            await client.request(
                createItem(COLLECTION, payload)
            );
        }
        return true;
    } catch (error) {
        console.error("Failed to update ordering settings:", error);
        return false;
    }
}
