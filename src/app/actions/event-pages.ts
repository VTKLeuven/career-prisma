"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth-server";
import {
  listEventPagesAdmin,
  createEventPage,
  updateEventPage,
  deleteEventPage,
  type AdminEventPageRow,
} from "@/lib/repos/event-page";
import type { ActionResult } from "@/components/admin/types";

export async function listEventPagesAdminAction(): Promise<AdminEventPageRow[]> {
  await requireAdminUser();
  return listEventPagesAdmin();
}

export async function createEventPageAction(data: Record<string, unknown>): Promise<ActionResult<AdminEventPageRow>> {
  try {
    await requireAdminUser();
    const page = await createEventPage(data);
    revalidatePath("/admin/event-pages");
    revalidatePath("/event");
    return { success: true, data: page };
  } catch (error) {
    console.error("[createEventPageAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create event page" };
  }
}

export async function updateEventPageAction(id: string, data: Record<string, unknown>): Promise<ActionResult<AdminEventPageRow>> {
  try {
    await requireAdminUser();
    const page = await updateEventPage(Number(id), data);
    revalidatePath("/admin/event-pages");
    revalidatePath("/event");
    return { success: true, data: page };
  } catch (error) {
    console.error("[updateEventPageAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update event page" };
  }
}

export async function deleteEventPageAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminUser();
    await deleteEventPage(Number(id));
    revalidatePath("/admin/event-pages");
    revalidatePath("/event");
    return { success: true };
  } catch (error) {
    console.error("[deleteEventPageAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete event page" };
  }
}
