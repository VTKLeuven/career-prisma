// lib/repos/schedule.ts
"use server";

import { prisma } from "@/lib/prisma";
import { shapeSchedule } from "@/lib/repos/_shape";
import type { Schedule, Master } from "@/lib/schema";

/** Master ids arrive as strings from company.category; the column is an int. */
function masterIdsToNumbers(ids?: string[]): number[] | undefined {
  if (!ids?.length) return undefined;
  const nums = ids
    .map((v: any) => Number(typeof v === "object" && v !== null ? v.id : v))
    .filter((n) => Number.isFinite(n));
  return nums.length ? nums : undefined;
}

/** Fetch all schedules for an event. Optionally filter by master IDs (e.g. company.category). */
export async function getSchedulesForEvent(
  eventId: string,
  masterIds?: string[]
): Promise<Array<Schedule & { master?: Master; pdf?: { id?: string } }>> {
  try {
    const masters = masterIdsToNumbers(masterIds);

    const rows = await prisma.schedule.findMany({
      where: {
        event_id: eventId,
        ...(masters ? { master_id: { in: masters } } : {}),
      },
      include: { master: true },
      take: 500,
    });

    return rows.map(shapeSchedule) as Array<
      Schedule & { master?: Master; pdf?: { id?: string } }
    >;
  } catch (error) {
    console.error("[getSchedulesForEvent]", error);
    return [];
  }
}

/** Check if an event has any schedules (for header button visibility). */
export async function hasSchedulesForEvent(eventId: string): Promise<boolean> {
  try {
    const count = await prisma.schedule.count({
      where: { event_id: eventId },
      take: 1,
    });
    return count > 0;
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
    await prisma.schedule.create({
      data: {
        event_id: data.event,
        master_id: Number(data.master),
        pdf_id: data.pdf,
      },
    });
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
    await prisma.schedule.delete({ where: { id: Number(id) } });
    return { success: true };
  } catch (error) {
    console.error("[deleteSchedule]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete schedule",
    };
  }
}
