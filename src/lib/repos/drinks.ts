"use server"

import { readItems, createItem, updateItem, deleteItem } from "@directus/sdk";
import { directus, getAuthedDirectusOrThrow, getAdminDirectusClient } from "@/lib/directus";
import type { Drink } from "@/lib/schema";

function getBrusselsTimeMinutes(): number {
    const now = new Date();
    const brusselsStr = now.toLocaleString('en-GB', {
        timeZone: 'Europe/Brussels',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    const [h, m] = brusselsStr.split(':').map(Number);
    return h * 60 + m;
}

function parseTimeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

function isVisibleNow(drink: Drink): boolean {
    if (!drink.visible_from && !drink.visible_until) return true;

    const now = getBrusselsTimeMinutes();
    const from = drink.visible_from ? parseTimeToMinutes(drink.visible_from) : 0;
    const until = drink.visible_until ? parseTimeToMinutes(drink.visible_until) : 24 * 60;

    if (from <= until) {
        return now >= from && now < until;
    }
    // Wraps midnight (e.g. 22:00 - 02:00)
    return now >= from || now < until;
}

export async function listDrinks(opts?: {
    visible_only?: boolean;
}) {
    try {
        const filter: Record<string, any> = {};
        if (opts?.visible_only) {
            filter.is_active = { _eq: true };
        }

        const client = getAdminDirectusClient() || directus;

        const drinks = await client.request(
            readItems("drinks" as any, {
                fields: ["*", "image.*" as any],
                filter,
                sort: ["name"] as any,
            })
        ) as unknown as Drink[];

        if (opts?.visible_only) {
            return drinks.filter(isVisibleNow);
        }

        return drinks;
    } catch (error) {
        console.error("Error listing drinks:", error);
        return [];
    }
}

export async function createDrink(data: Partial<Drink>) {
    const client = getAdminDirectusClient() || await getAuthedDirectusOrThrow();
    return client.request(createItem("drinks" as any, data)) as Promise<Drink>;
}

export async function updateDrink(id: string, data: Partial<Drink>) {
    const client = getAdminDirectusClient() || await getAuthedDirectusOrThrow();
    return client.request(updateItem("drinks" as any, id, data)) as Promise<Drink>;
}

export async function deleteDrink(id: string) {
    const client = getAdminDirectusClient() || await getAuthedDirectusOrThrow();
    return client.request(deleteItem("drinks" as any, id));
}
