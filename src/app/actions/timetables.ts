"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth-server";
import {
  listTimetables,
  createTimetable,
  updateTimetable,
  deleteTimetable,
} from "@/lib/repos/timetable";
import type { ActionResult } from "@/components/admin/types";
import type { TimeSlot } from "@/lib/schema";

export async function listTimetablesAction(): Promise<TimeSlot[]> {
  await requireAdminUser();
  return listTimetables({ limit: 1000 });
}

export async function createTimetableAction(data: Record<string, unknown>): Promise<ActionResult<TimeSlot>> {
  try {
    await requireAdminUser();
    const slot = await createTimetable(data);
    revalidatePath("/admin/timetable");
    return { success: true, data: slot };
  } catch (error) {
    console.error("[createTimetableAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create timetable slot" };
  }
}

export async function updateTimetableAction(id: string, data: Record<string, unknown>): Promise<ActionResult<TimeSlot>> {
  try {
    await requireAdminUser();
    const slot = await updateTimetable(Number(id), data);
    revalidatePath("/admin/timetable");
    return { success: true, data: slot };
  } catch (error) {
    console.error("[updateTimetableAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update timetable slot" };
  }
}

export async function deleteTimetableAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminUser();
    await deleteTimetable(Number(id));
    revalidatePath("/admin/timetable");
    return { success: true };
  } catch (error) {
    console.error("[deleteTimetableAction]", error);
    return {
      success: false,
      error:
        "Could not delete this timetable slot. It is linked to a speaker or an event page — remove those links first.",
    };
  }
}
