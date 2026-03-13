"use server";

import { getOrderingSettings } from "@/lib/repos/ordering-settings";
import { getBoothIdForCompany } from "@/lib/repos/booths";

/**
 * For company reps: returns whether they should see the Ordering tab and their booth ID.
 * Only fetches when user has a company.
 */
export async function getCompanyOrderingTabInfo(companyId: string): Promise<{
    enabled: boolean;
    boothId: string | null;
}> {
    try {
        const { enabled, activeEventId } = await getOrderingSettings();
        const boothId = await getBoothIdForCompany(companyId, activeEventId);
        return { enabled, boothId };
    } catch {
        return { enabled: false, boothId: null };
    }
}
