"use server"

// lib/repos/zones.ts
import { readItems, createItem, updateItem, deleteItem, readMe } from "@directus/sdk";
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
            client = getAdminDirectusClient() || directus;
        }

        const zones = await client.request(
            readItems("zones", {
                fields: [
                    "*",
                    "booths.*" as any,
                    // M2M traversal: zones -> zones_booths -> Booths
                    // We try both common junction field naming patterns just in case
                    "booths.Booths_id.*" as any,
                    "booths.Booths_id.company.name" as any,
                    "booths.booth_id.*" as any,
                    "booths.booth_id.company.name" as any,
                ],
                sort: ["name"] as any,
            })
        ) as unknown as any[];

        // Flatten M2M data: The API returns junction objects, but the UI expects Booth objects.
        return zones.map((zone) => {
            if (Array.isArray(zone.booths)) {
                zone.booths = zone.booths.map((b: any) => {
                    // Extract the related Booth object from the junction record
                    // The junction field is likely 'Booths_id' or 'booth_id'
                    return b.Booths_id || b.booth_id || b;
                }).filter(Boolean); // changes [ {Booths_id: Booth}, ... ] to [ Booth, ... ]
            }
            return zone as Zone;
        });
    } catch (error) {
        console.error("Error listing zones:", error);
        return [];
    }
}

export async function createZone(data: Partial<Zone>) {
    const adminClient = getAdminDirectusClient();
    const userClient = await getAuthedDirectusOrThrow();

    // Use user client (session) primarily. Admin token is backup.
    const client = userClient || adminClient;

    try {
        // Separate booths to isolate permission errors
        const { booths, ...zoneData } = data;

        const zone = await client.request(createItem("zones", zoneData)) as Zone;

        if (booths && Array.isArray(booths) && booths.length > 0) {
            // Strategy: Direct Junction Table Creation
            // We bypass the "Update Zone" alias logic and insert directly into 'zones_Booths'.
            const assignBoothsDirectly = async (updaterClient: any) => {
                // Ensure strictly ID strings/numbers
                const targetBoothIds = booths.map((b: any) => typeof b === 'object' ? b.id : b);

                const creations = targetBoothIds.map((boothId: string | number) =>
                    updaterClient.request((createItem as any)("zones_Booths", {
                        zones_id: zone.id,
                        Booths_id: boothId
                    }))
                );
                await Promise.all(creations);
                return true;
            };

            try {
                // Try with User Client first
                await assignBoothsDirectly(client);
                zone.booths = booths;
            } catch (errorStrategy1: any) {
                console.warn(`[createZone] Direct Junction Create failed. Falling back to Admin Client...`);
                // Fallback to Admin Client
                if (client === userClient && adminClient) {
                    try {
                        await assignBoothsDirectly(adminClient);
                        zone.booths = booths;
                    } catch (finalError: any) {
                        console.error(`[createZone] All strategies failed:`, finalError.message || finalError);
                        // We still return the area, partially created
                    }
                } else {
                    console.error(`[createZone] Failed to create junction records:`, errorStrategy1.message || errorStrategy1);
                }
            }
        }

        return zone;
    } catch (e: any) {
        console.error("[createZone] Error creating zone:", JSON.stringify(e?.errors || e));
        throw e;
    }
}

export async function updateZone(id: string, data: Partial<Zone>) {
    const adminClient = getAdminDirectusClient();
    const userClient = await getAuthedDirectusOrThrow().catch(() => null);

    // Prioritize user session
    const client = userClient || adminClient;

    if (!client) throw new Error("Unauthorized");

    // Separate booths from zone data to avoid alias permission errors
    const { booths, ...zoneData } = data;

    // 1. Update Core Zone Data
    const updatedZone = await client.request(updateItem("zones", id, zoneData)) as Zone;

    // 2. Sync Booths (if provided)
    if (booths && Array.isArray(booths)) {
        // Ensure strictly ID strings/numbers
        const targetBoothIds = booths.map((b: any) => typeof b === 'object' ? b.id : b).map(String);

        // Fetch existing junction records
        const existingJunctions = await client.request(readItems("zones_Booths", {
            filter: { zones_id: { _eq: id } },
            limit: -1
        })) as any[];

        const existingBoothIds = existingJunctions.map((r: any) => String(r.Booths_id));

        // Determine changes
        const toCreate = targetBoothIds.filter(bid => !existingBoothIds.includes(bid));
        const toDeleteJunctionIds = existingJunctions
            .filter((r: any) => !targetBoothIds.includes(String(r.Booths_id)))
            .map((r: any) => r.id);

        // Execute Deletes
        if (toDeleteJunctionIds.length > 0) {
            await Promise.all(toDeleteJunctionIds.map(id =>
                client.request((deleteItem as any)("zones_Booths", id))
            ));
        }

        // Execute Creates
        if (toCreate.length > 0) {
            const creations = toCreate.map((boothId: string) =>
                client.request((createItem as any)("zones_Booths", {
                    zones_id: id,
                    Booths_id: boothId
                }))
            );
            await Promise.all(creations);
        }

        // Return potentially updated structure (though UI might need refresh)
        updatedZone.booths = booths;
    }

    return updatedZone;
}

export async function deleteZone(id: string) {
    const userClient = await getAuthedDirectusOrThrow().catch(() => null);
    const adminClient = getAdminDirectusClient();
    const client = userClient || adminClient;

    if (!client) throw new Error("Unauthorized");

    return client.request(deleteItem("zones", id));
}
