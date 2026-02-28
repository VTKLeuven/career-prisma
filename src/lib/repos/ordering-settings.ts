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

/** Get whether company reps can see the Ordering tab in their dashboard */
export async function getCompanyOrderingEnabled(): Promise<boolean> {
    try {
        const client = await getAdminDirectusClient();
        if (!client) return false;

        const rows = await client.request(
            readItems(COLLECTION, {
                fields: ["company_ordering_enabled"],
                limit: 1,
            })
        ) as { company_ordering_enabled?: boolean }[];

        return rows[0]?.company_ordering_enabled ?? false;
    } catch {
        return false;
    }
}

/** Set whether company reps can see the Ordering tab */
export async function setCompanyOrderingEnabled(enabled: boolean): Promise<boolean> {
    try {
        const client = await getAdminDirectusClient();
        if (!client) return false;

        const existing = await client.request(
            readItems(COLLECTION, { fields: ["id"], limit: 1 })
        ) as { id: string }[];

        if (existing.length > 0) {
            await client.request(
                updateItem(COLLECTION, existing[0].id, { company_ordering_enabled: enabled })
            );
        } else {
            await client.request(
                createItem(COLLECTION, { company_ordering_enabled: enabled })
            );
        }
        return true;
    } catch (error) {
        console.error("Failed to update company ordering setting:", error);
        return false;
    }
}
