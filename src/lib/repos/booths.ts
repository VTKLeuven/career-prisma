"use server";

import { readItems } from "@directus/sdk";
import { getAdminDirectusClient } from "@/lib/directus";

/**
 * Get the booth ID for a company to use when ordering drinks.
 * When a company has multiple booths (e.g. 164 and 165), returns the one with the
 * highest booth_number (e.g. 165) so the correct zone and booth display in the shifter dashboard.
 * Returns null if the company has no booth assigned.
 */
export async function getBoothIdForCompany(companyId: string): Promise<string | null> {
    try {
        const client = await getAdminDirectusClient();
        if (!client) return null;

        const booths = await client.request(
            readItems("Booths", {
                fields: ["id", "booth_number"],
                filter: {
                    company: { _eq: companyId as any },
                },
                limit: 1,
                sort: ["-booth_number"], // Descending: prefer highest booth number (e.g. 165 over 164)
            })
        ) as { id: string }[];

        return booths[0]?.id ?? null;
    } catch {
        return null;
    }
}
