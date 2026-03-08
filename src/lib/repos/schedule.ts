// lib/repos/schedule.ts
"use server";

import { readItems, createItem, deleteItem } from "@directus/sdk";
import { getServerDirectusClient, getDirectusWithToken } from "@/lib/directus";
import type { Schedule, Master } from "@/lib/schema";

/** Fetch all schedules for an event. Optionally filter by master IDs (e.g. company.category). */
export async function getSchedulesForEvent(
  eventId: string,
  masterIds?: string[]
): Promise<Array<Schedule & { master?: Master; pdf?: { id?: string } }>> {
  try {
    const client = await getServerDirectusClient();
    if (!client) return [];

    const filter: Record<string, unknown> = {
      event: { _eq: eventId },
    };

    if (masterIds && masterIds.length > 0) {
      (filter as Record<string, unknown>).master = { _in: masterIds };
    }

    const items = await client.request(
      readItems("schedule" as any, {
        fields: ["id", "event", "master", "pdf", { master: ["id", "name", "short_name"] }],
        filter: filter as any,
        limit: 500,
      })
    );

    return (items ?? []) as Array<Schedule & { master?: Master; pdf?: { id?: string } }>;
  } catch (error) {
    console.error("[getSchedulesForEvent]", error);
    return [];
  }
}

/** Check if an event has any schedules (for header button visibility). */
export async function hasSchedulesForEvent(eventId: string): Promise<boolean> {
  try {
    const client = await getServerDirectusClient();
    if (!client) return false;

    const items = await client.request(
      readItems("schedule" as any, {
        fields: ["id"],
        filter: { event: { _eq: eventId } } as any,
        limit: 1,
      })
    );

    return Array.isArray(items) && items.length > 0;
  } catch (error) {
    console.error("[hasSchedulesForEvent]", error);
    return false;
  }
}

/** Create a schedule (admin only). */
export async function createSchedule(data: {
  event: string;
  master: string;
  pdf: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getDirectusWithToken();
    if (!client) return { success: false, error: "Not authenticated" };

    await client.request(
      createItem("schedule" as any, {
        event: data.event,
        master: data.master,
        pdf: data.pdf,
      })
    );
    return { success: true };
  } catch (error) {
    console.error("[createSchedule]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create schedule",
    };
  }
}

/** Delete a schedule (admin only). */
export async function deleteSchedule(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getDirectusWithToken();
    if (!client) return { success: false, error: "Not authenticated" };

    await client.request(deleteItem("schedule" as any, id));
    return { success: true };
  } catch (error) {
    console.error("[deleteSchedule]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete schedule",
    };
  }
}
