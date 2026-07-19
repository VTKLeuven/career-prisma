"use server"

import { prisma } from "@/lib/prisma";
import { shapeTime } from "@/lib/repos/_shape";
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
    const { image_id, visible_from, visible_until, ...rest } = row;
    return {
        ...rest,
        image: image_id ?? undefined,
        visible_from: shapeTime(visible_from) ?? undefined,
        visible_until: shapeTime(visible_until) ?? undefined,
    } as Drink;
}

function timeValue(value: unknown): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    if (value instanceof Date) return value;
    const match = String(value).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) throw new Error(`Invalid time: ${String(value)}`);
    const [, hour, minute, second = "00"] = match;
    return new Date(`1970-01-01T${hour.padStart(2, "0")}:${minute}:${second}.000Z`);
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
    const { image, id: _id, visible_from, visible_until, ...rest } = data as Record<string, any>;
    const row = await prisma.drink.create({
        data: {
            ...rest,
            visible_from: timeValue(visible_from),
            visible_until: timeValue(visible_until),
            ...(image !== undefined ? { image_id: image || null } : {}),
        },
    });
    return shapeDrink(row);
}

export async function updateDrink(id: string, data: Partial<Drink>) {
    const { image, id: _id, visible_from, visible_until, ...rest } = data as Record<string, any>;
    const row = await prisma.drink.update({
        where: { id },
        data: {
            ...rest,
            ...(visible_from !== undefined ? { visible_from: timeValue(visible_from) } : {}),
            ...(visible_until !== undefined ? { visible_until: timeValue(visible_until) } : {}),
            ...(image !== undefined ? { image_id: image || null } : {}),
        },
    });
    return shapeDrink(row);
}

export async function deleteDrink(id: string) {
    return prisma.drink.delete({ where: { id } });
}
