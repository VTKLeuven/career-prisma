"use server"

import { readItems, createItem, updateItem, deleteItem } from "@directus/sdk";
import { directus, getAuthedDirectusOrThrow, getAdminDirectusClient } from "@/lib/directus";
import type { Zone } from "@/lib/schema";

export async function listZones() {
    try {
        let client;
        try {
            // Try to use logged-in user's token first
            const { getDirectusWithToken } = await import("@/lib/directus");
            client = await getDirectusWithToken();
        } catch (e) {
            // ignore
        }

        if (!client) {
            client = await getAdminDirectusClient() || directus;
        }

        return client.request(
            readItems("zones", {
                fields: [
                    "*",
                    "booths.*",
                    // M2M traversal: zones -> zones_booths -> Booths
                    // We try both common junction field naming patterns just in case
                    "booths.Booths_id.*",
                    "booths.Booths_id.company.name",
                    "booths.booth_id.*",
                    "booths.booth_id.company.name",
                ],
                sort: ["name"],
            })
        ) as Promise<Zone[]>;
    } catch (error) {
        console.error("Error listing zones:", error);
        return [];
    }
}

export async function createZone(data: Partial<Zone>) {
    const adminClient = await getAdminDirectusClient();
    const userClient = await getAuthedDirectusOrThrow();

    const client = adminClient || userClient;
    console.log(`[createZone] Using ${adminClient ? "Admin Client (Server Token)" : "User Client (Session)"}`);

    try {
        return await client.request(createItem("zones", data)) as Promise<Zone>;
    } catch (e: any) {
        console.error("[createZone] Error:", JSON.stringify(e?.errors || e));
        throw e;
    }
}

export async function updateZone(id: string, data: Partial<Zone>) {
    const client = await getAdminDirectusClient() || await getAuthedDirectusOrThrow();
    return client.request(updateItem("zones", id, data)) as Promise<Zone>;
}

export async function deleteZone(id: string) {
    const client = await getAdminDirectusClient() || await getAuthedDirectusOrThrow();
    return client.request(deleteItem("zones", id));
}
