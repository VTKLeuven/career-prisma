"use server"

import { readItems, createItem, updateItem, deleteItem } from "@directus/sdk";
import { directus, getAuthedDirectusOrThrow, getAdminDirectusClient } from "@/lib/directus";
import type { Drink } from "@/lib/schema";

export async function listDrinks(opts?: {
    visible_only?: boolean;
}) {
    try {
        const filter: Record<string, any> = {};
        if (opts?.visible_only) {
            filter.is_active = { _eq: true };
            // Logic for time visibility can be refined here or in frontend
            // For now just active
        }

        const client = await getAdminDirectusClient() || directus;

        return client.request(
            readItems("drinks", {
                fields: ["*", "image.*" as any],
                filter,
                sort: ["name"] as any,
            })
        ) as unknown as Promise<Drink[]>;
    } catch (error) {
        console.error("Error listing drinks:", error);
        return [];
    }
}

export async function createDrink(data: Partial<Drink>) {
    const client = await getAdminDirectusClient() || await getAuthedDirectusOrThrow();
    return client.request(createItem("drinks", data)) as Promise<Drink>;
}

export async function updateDrink(id: string, data: Partial<Drink>) {
    const client = await getAdminDirectusClient() || await getAuthedDirectusOrThrow();
    return client.request(updateItem("drinks", id, data)) as Promise<Drink>;
}

export async function deleteDrink(id: string) {
    const client = await getAdminDirectusClient() || await getAuthedDirectusOrThrow();
    return client.request(deleteItem("drinks", id));
}
