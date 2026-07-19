"use server";

import { prisma } from "@/lib/prisma";

/**
 * Get the booth ID for a company to use when ordering drinks.
 *
 * If `activeEventId` is provided, restricts to the floorplan associated with
 * that event. Otherwise fallback behaviour is used:
 * When a company has multiple booths on the same (latest) floorplan
 * (e.g. 164 and 165), returns the one with the highest booth_number (165).
 *
 * If the company has booths on multiple floorplans/years, we:
 * - pick the floorplan with the highest numeric `year`
 * - within that floorplan, pick the highest `booth_number`
 *
 * This prevents old booths from previous years from being picked for the
 * current event, which caused wrong booth numbers in the shifter dashboard.
 *
 * Returns null if the company has no booth assigned.
 *
 * Note: `Floorplan.year` is a varchar, so the "latest year" comparison has to
 * happen after parsing rather than in an ORDER BY -- the same reason the
 * Directus version sorted in JavaScript.
 */
export async function getBoothIdForCompany(
    companyId: string,
    activeEventId?: string | null
): Promise<string | null> {
    try {
        let requiredFloorplanId: number | null = null;
        if (activeEventId) {
            const page = await prisma.careerEventPage.findFirst({
                where: { event_id: activeEventId },
                select: { floorplan_id: true },
            });
            requiredFloorplanId = page?.floorplan_id ?? null;
        }

        const booths = await prisma.booth.findMany({
            where: { company_id: companyId },
            select: {
                id: true,
                booth_number: true,
                floorplan_id: true,
                floorplan: { select: { id: true, year: true } },
            },
        });

        if (booths.length === 0) return null;

        // Strictly restrict to the event's floorplan when we know it, falling
        // back to the full set if the company has no booth there.
        let candidates = booths;
        let restrictedToEvent = false;
        if (requiredFloorplanId != null) {
            const onEventFloorplan = booths.filter((b) => b.floorplan_id === requiredFloorplanId);
            if (onEventFloorplan.length > 0) {
                candidates = onEventFloorplan;
                restrictedToEvent = true;
            }
        }

        // Year filtering only applies when we did not already pin the floorplan.
        if (!restrictedToEvent) {
            const years = candidates
                .map((b) => parseInt(b.floorplan?.year ?? "", 10))
                .filter((n) => !Number.isNaN(n));

            if (years.length > 0) {
                const maxYear = Math.max(...years);
                candidates = candidates.filter(
                    (b) => parseInt(b.floorplan?.year ?? "", 10) === maxYear
                );
            }
        }

        if (candidates.length === 0) return null;

        const best = candidates.reduce((acc, b) =>
            (b.booth_number ?? -Infinity) > (acc.booth_number ?? -Infinity) ? b : acc
        );

        return best?.id != null ? String(best.id) : null;
    } catch {
        return null;
    }
}
