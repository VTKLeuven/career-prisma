"use server"

import { readItems, createItem, updateItem, deleteItem } from "@directus/sdk";
import { directus, getAuthedDirectusOrThrow, getAdminDirectusClient } from "@/lib/directus";
import type { Zone } from "@/lib/schema";

export async function listZones() {
    try {
        const client = await getAdminDirectusClient() || directus;
        return client.request(
            readItems("zones", {
                fields: ["*", "booths.*", "booths.company.name", "booths.booth_number"],
                sort: ["name"],
            })
        ) as Promise<Zone[]>;
    } catch (error) {
        console.error("Error listing zones:", error);
        return [];
    }
}

export async function createZone(data: Partial<Zone>) {
    const client = await getAuthedDirectusOrThrow();
    return client.request(createItem("zones", data)) as Promise<Zone>;
}

export async function updateZone(id: string, data: Partial<Zone>) {
    const client = await getAuthedDirectusOrThrow();
    return client.request(updateItem("zones", id, data)) as Promise<Zone>;
}

export async function deleteZone(id: string) {
    const client = await getAuthedDirectusOrThrow();
    return client.request(deleteItem("zones", id));
}
