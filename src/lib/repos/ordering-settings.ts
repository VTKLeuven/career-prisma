"use server";

import { prisma } from "@/lib/prisma";

/**
 * Singleton settings row controlling whether company reps see the Ordering tab.
 * There is exactly one row; it is created on first write if missing.
 */

/** Get whether company reps can see the Ordering tab in their dashboard and the active event */
export async function getOrderingSettings(): Promise<{ enabled: boolean, activeEventId: string | null }> {
    try {
        const row = await prisma.orderingSettings.findFirst({
            select: { company_ordering_enabled: true, active_event_id: true },
        });

        return {
            enabled: row?.company_ordering_enabled ?? false,
            activeEventId: row?.active_event_id ?? null,
        };
    } catch {
        return { enabled: false, activeEventId: null };
    }
}

/** Set whether company reps can see the Ordering tab and the active event */
export async function setOrderingSettings(enabled: boolean, activeEventId: string | null): Promise<boolean> {
    try {
        const payload = {
            company_ordering_enabled: enabled,
            active_event_id: activeEventId,
        };

        const existing = await prisma.orderingSettings.findFirst({ select: { id: true } });

        if (existing) {
            await prisma.orderingSettings.update({ where: { id: existing.id }, data: payload });
        } else {
            await prisma.orderingSettings.create({ data: payload });
        }
        return true;
    } catch (error) {
        console.error("Failed to update ordering settings:", error);
        return false;
    }
}
