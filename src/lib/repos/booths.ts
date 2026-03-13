"use server";

import { readItems } from "@directus/sdk";
import { getAdminDirectusClient } from "@/lib/directus";

type BoothWithFloorplanMeta = {
    id: string;
    booth_number: number;
    Floorplan?: {
        id: string;
        year?: string;
    } | string;
};

/**
 * Get the booth ID for a company to use when ordering drinks.
 *
 * If `activeEventId` is provided, restricts to the floorplan associated with that event.
 * Otherwise fallback behavior is used:
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
 */
export async function getBoothIdForCompany(companyId: string, activeEventId?: string | null): Promise<string | null> {
    try {
        const client = await getAdminDirectusClient();
        if (!client) return null;

        // If an active event is provided, try to find the event page to get its floorplan ID.
        let requiredFloorplanId: string | null = null;
        if (activeEventId) {
            const eventPages = await client.request(
                readItems("career_event_page", {
                    // Request only the floorplan relation with its id to reduce payload size
                    fields: [{ floorplan: ["id"] }] as any,
                    filter: { event: { _eq: activeEventId as any } },
                    limit: 1,
                })
            ) as { floorplan?: { id: string } }[];

            if (eventPages.length > 0 && eventPages[0].floorplan?.id) {
                requiredFloorplanId = eventPages[0].floorplan.id;
            }
        }

        const booths = await client.request(
            readItems("Booths", {
                fields: ["id", "booth_number", { Floorplan: ["id", "year"] }] as any,
                filter: {
                    company: { _eq: companyId as any },
                },
                limit: -1,
                sort: ["Floorplan.year", "booth_number"] as any,
            })
        ) as unknown as BoothWithFloorplanMeta[];

        if (!booths || booths.length === 0) {
            return null;
        }

        // If we have a required floorplan, strictly restrict options to it.
        let candidateBooths = booths;
        if (requiredFloorplanId) {
            candidateBooths = booths.filter(b => {
                const fp = b.Floorplan;
                if (typeof fp === "string") return fp === requiredFloorplanId;
                if (typeof fp === "object" && fp?.id) return fp.id === requiredFloorplanId;
                return false;
            });

            // If the company doesn't have a booth for the required floorplan, fallback to best attempt
            if (candidateBooths.length === 0) {
                candidateBooths = booths;
            }
        }

        // Only do the year filtering if we're not strictly filtering by event floorplan
        if (!requiredFloorplanId || candidateBooths === booths) {
            // Determine the latest floorplan year for this company (numeric compare).
            const years = candidateBooths
                .map((b) => {
                    const fp = b.Floorplan;
                    const yearStr = typeof fp === "object" && fp?.year ? fp.year : undefined;
                    const n = yearStr ? parseInt(yearStr, 10) : Number.NaN;
                    return Number.isNaN(n) ? null : n;
                })
                .filter((n): n is number => n !== null);

            if (years.length > 0) {
                const maxYear = Math.max(...years);
                candidateBooths = candidateBooths.filter((b) => {
                    const fp = b.Floorplan;
                    const yearStr = typeof fp === "object" && fp?.year ? fp.year : undefined;
                    const n = yearStr ? parseInt(yearStr, 10) : Number.NaN;
                    return !Number.isNaN(n) && n === maxYear;
                });
            }
        }

        if (candidateBooths.length === 0) {
            return null;
        }

        // Within the chosen floorplan/year, pick the booth with highest booth_number.
        const best = candidateBooths.reduce((acc, b) =>
            !acc || b.booth_number > acc.booth_number ? b : acc,
            candidateBooths[0]
        );

        return best?.id ?? null;
    } catch {
        return null;
    }
}
