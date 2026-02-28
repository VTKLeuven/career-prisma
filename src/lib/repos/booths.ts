"use server";

import { readItems } from "@directus/sdk";
import { getAdminDirectusClient } from "@/lib/directus";

/**
 * Get the first booth ID assigned to a company.
 * Used for company reps to order drinks at their booth.
 * Returns null if the company has no booth assigned.
 */
export async function getBoothIdForCompany(companyId: string): Promise<string | null> {
    try {
        const client = await getAdminDirectusClient();
        if (!client) return null;

        const booths = await client.request(
            readItems("Booths", {
                fields: ["id"],
                filter: {
                    company: { _eq: companyId as any },
                },
                limit: 1,
                sort: ["id"],
            })
        ) as { id: string }[];

        return booths[0]?.id ?? null;
    } catch {
        return null;
    }
}
