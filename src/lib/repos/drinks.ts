"use server"

import { prisma } from "@/lib/prisma";
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

/** Consumers pass `image` straight to getFileUrl(), so it stays a bare file id. */
function shapeDrink(row: Record<string, any>): Drink {
    const { image_id, ...rest } = row;
    return { ...rest, image: image_id ?? undefined } as Drink;
}

export async function listDrinks(opts?: {
    visible_only?: boolean;
}) {
    try {
        const rows = await prisma.drink.findMany({
            // Directus enforced `is_active = true` for the public role too. That
            // rule now lives here, because Prisma has no policy layer to fall
            // back on.
            where: opts?.visible_only ? { is_active: true } : undefined,
            orderBy: { name: "asc" },
        });

        const drinks = rows.map(shapeDrink);
        return opts?.visible_only ? drinks.filter(isVisibleNow) : drinks;
    } catch (error) {
        console.error("Error listing drinks:", error);
        return [];
    }
}

export async function createDrink(data: Partial<Drink>) {
    const { image, id: _id, ...rest } = data as Record<string, any>;
    const row = await prisma.drink.create({
        data: { ...rest, ...(image !== undefined ? { image_id: image || null } : {}) },
    });
    return shapeDrink(row);
}

export async function updateDrink(id: string, data: Partial<Drink>) {
    const { image, id: _id, ...rest } = data as Record<string, any>;
    const row = await prisma.drink.update({
        where: { id },
        data: { ...rest, ...(image !== undefined ? { image_id: image || null } : {}) },
    });
    return shapeDrink(row);
}

export async function deleteDrink(id: string) {
    return prisma.drink.delete({ where: { id } });
}
