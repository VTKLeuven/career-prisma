"use server";

import { revalidatePath } from "next/cache";
import { getUserFromCookies } from "@/lib/auth-server";
import {
  listScreens,
  createScreen,
  updateScreen,
  deleteScreen,
  getPublishedScreenBySlug,
  listMedia,
  deleteMedia,
  listScheduleSlots,
  createScheduleSlot,
  updateScheduleSlot,
  deleteScheduleSlot,
} from "@/lib/repos/signage";
import type {
  SignageMedia,
  SignageScheduleSlot,
  SignageScreen,
} from "@/lib/schema";

async function requireAdmin() {
  const user = await getUserFromCookies();
  if (!user?.admin) throw new Error("Unauthorized");
}

function failure(error: unknown, fallback: string) {
  return { success: false as const, error: error instanceof Error ? error.message : fallback };
}

export async function fetchScreensAction(): Promise<SignageScreen[]> {
  await requireAdmin();
  return listScreens();
}

export async function createScreenAction(data: { name: string; slug: string }) {
  try {
    await requireAdmin();
    const created = await createScreen(data);
    revalidatePath("/admin/signage");
    revalidatePath("/screen");
    return { success: true, data: created };
  } catch (error) {
    return failure(error, "Failed to create screen");
  }
}

export async function updateScreenAction(
  id: string,
  data: Partial<SignageScreen>
) {
  try {
    await requireAdmin();
    await updateScreen(id, data);
    revalidatePath("/admin/signage");
    revalidatePath("/screen");
    return { success: true };
  } catch (error) {
    return failure(error, "Failed to update screen");
  }
}

export async function deleteScreenAction(id: string) {
  try {
    await requireAdmin();
    await deleteScreen(id);
    revalidatePath("/admin/signage");
    revalidatePath("/screen");
    return { success: true };
  } catch (error) {
    return failure(error, "Failed to delete screen");
  }
}

export async function fetchMediaAction(): Promise<SignageMedia[]> {
  await requireAdmin();
  return listMedia();
}

export async function deleteMediaAction(id: string) {
  try {
    await requireAdmin();
    await deleteMedia(id);
    revalidatePath("/admin/signage");
    return { success: true };
  } catch (error) {
    return failure(error, "Failed to delete media");
  }
}

export async function fetchScheduleSlotsAction(
  screenId: string
): Promise<SignageScheduleSlot[]> {
  await requireAdmin();
  return listScheduleSlots(screenId);
}

export async function createScheduleSlotAction(data: {
  screen: string;
  media: string;
  start_time: string;
  end_time: string;
}) {
  try {
    await requireAdmin();
    const created = await createScheduleSlot(data);
    revalidatePath("/admin/signage");
    return { success: true, data: created };
  } catch (error) {
    return failure(error, "Failed to create slot");
  }
}

export async function updateScheduleSlotAction(
  id: string,
  data: Partial<{ media: string; start_time: string; end_time: string }>
) {
  try {
    await requireAdmin();
    await updateScheduleSlot(id, data);
    revalidatePath("/admin/signage");
    return { success: true };
  } catch (error) {
    return failure(error, "Failed to update slot");
  }
}

export async function deleteScheduleSlotAction(id: string) {
  try {
    await requireAdmin();
    await deleteScheduleSlot(id);
    revalidatePath("/admin/signage");
    return { success: true };
  } catch (error) {
    return failure(error, "Failed to delete slot");
  }
}

export async function fetchScreenBySlugAction(slug: string) {
  return getPublishedScreenBySlug(slug);
}
