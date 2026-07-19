"use server"

// lib/repos/zones.ts
import { prisma } from "@/lib/prisma";
import { shapeBooth } from "@/lib/repos/_shape";
import type { Zone } from "@/lib/schema";

/**
 * The previous implementation carried a lot of machinery that existed only to
 * work around Directus: trying the user token then falling back to an admin
 * token, requesting two possible junction field spellings because the alias
 * name was uncertain, and writing junction rows one at a time because updating
 * the m2m alias tripped permission errors. None of that is needed against the
 * database directly -- the junction is just a table.
 */

const ZONE_INCLUDE = {
    zoneBooths: { include: { booth: { include: { company: true } } } },
} as const;

/** Flattens junction rows so callers see `zone.booths` as a plain Booth[]. */
function shapeZone(row: Record<string, any>): Zone {
    const { zoneBooths, ...rest } = row;
    return {
        ...rest,
        booths: (zoneBooths ?? [])
            .map((zb: any) => zb.booth)
            .filter(Boolean)
            .map(shapeBooth),
    } as Zone;
}

export async function listZones() {
    try {
        const rows = await prisma.zone.findMany({
            include: ZONE_INCLUDE,
            orderBy: { name: "asc" },
        });
        return rows.map(shapeZone);
    } catch (error) {
        console.error("Error listing zones:", error);
        return [];
    }
}

function boothIds(booths: unknown): number[] {
    if (!Array.isArray(booths)) return [];
    return booths
        .map((b: any) => (typeof b === "object" && b !== null ? b.id : b))
        .map((v: any) => Number(v))
        .filter((n: number) => Number.isFinite(n));
}

export async function createZone(data: Partial<Zone>) {
    const { booths, id: _id, ...zoneData } = data as Record<string, any>;
    const ids = boothIds(booths);

    const row = await prisma.zone.create({
        data: {
            ...zoneData,
            ...(ids.length
                ? { zoneBooths: { create: ids.map((booth_id) => ({ booth_id })) } }
                : {}),
        },
        include: ZONE_INCLUDE,
    });

    return shapeZone(row);
}

export async function updateZone(id: string, data: Partial<Zone>) {
    const { booths, id: _id, ...zoneData } = data as Record<string, any>;
    const zoneId = Number(id);

    // Booth membership is only touched when the caller actually supplied it,
    // matching the previous behaviour of leaving it alone when omitted.
    const syncBooths = Array.isArray(booths);
    const ids = boothIds(booths);

    const row = await prisma.$transaction(async (tx) => {
        await tx.zone.update({ where: { id: zoneId }, data: zoneData });

        if (syncBooths) {
            // Replace the membership set in a couple of statements instead of
            // the per-row create/delete round trips the Directus version needed.
            await tx.zoneBooth.deleteMany({
                where: { zone_id: zoneId, ...(ids.length ? { booth_id: { notIn: ids } } : {}) },
            });
            if (ids.length) {
                const existing = await tx.zoneBooth.findMany({
                    where: { zone_id: zoneId },
                    select: { booth_id: true },
                });
                const have = new Set(existing.map((e) => e.booth_id));
                const toAdd = ids.filter((b) => !have.has(b));
                if (toAdd.length) {
                    await tx.zoneBooth.createMany({
                        data: toAdd.map((booth_id) => ({ zone_id: zoneId, booth_id })),
                    });
                }
            }
        }

        return tx.zone.findUnique({ where: { id: zoneId }, include: ZONE_INCLUDE });
    });

    return shapeZone(row as Record<string, any>);
}

export async function deleteZone(id: string) {
    const zoneId = Number(id);
    // The junction has no cascade, so its rows go first.
    return prisma.$transaction(async (tx) => {
        await tx.zoneBooth.deleteMany({ where: { zone_id: zoneId } });
        return tx.zone.delete({ where: { id: zoneId } });
    });
}
