"use server";

import { revalidatePath } from "next/cache";
import { getUserFromCookies } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import type {
  SignageMedia,
  SignageScheduleSlot,
  SignageScreen,
} from "@/lib/schema";

async function requireAdmin() {
  const user = await getUserFromCookies();
  if (!user?.admin) throw new Error("Unauthorized");
}

function timeValue(value: string): Date {
  const normalized = /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  return new Date(`1970-01-01T${normalized}Z`);
}

function formatTime(value: Date | null): string {
  return value?.toISOString().slice(11, 16) || "";
}

function shapeMedia(row: any): SignageMedia {
  return {
    id: String(row.id),
    name: row.name || "",
    type: row.type || "image",
    file: row.file
      ? {
          id: row.file.id,
          filename_download: row.file.filename_download,
          type: row.file.type,
        }
      : row.file_id,
  } as SignageMedia;
}

function shapeSlot(row: any): SignageScheduleSlot {
  return {
    id: String(row.id),
    screen: row.screen
      ? {
          ...row.screen,
          id: String(row.screen.id),
        }
      : String(row.screen_id),
    file: row.file ? shapeMedia(row.file) : null,
    start_time: formatTime(row.start_time),
    end_time: formatTime(row.end_time),
  };
}

export async function fetchScreensAction(): Promise<SignageScreen[]> {
  const rows = await prisma.signageScreen.findMany({ orderBy: { name: "asc" } });
  return rows.map((row) => ({ ...row, id: String(row.id) })) as SignageScreen[];
}

export async function createScreenAction(data: { name: string; slug: string }) {
  try {
    await requireAdmin();
    const created = await prisma.signageScreen.create({
      data: { name: data.name, slug: data.slug.trim(), status: "published" },
    });
    revalidatePath("/admin/signage");
    revalidatePath("/screen");
    return { success: true, data: { ...created, id: String(created.id) } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create screen" };
  }
}

export async function updateScreenAction(
  id: string,
  data: Partial<SignageScreen>
) {
  try {
    await requireAdmin();
    await prisma.signageScreen.update({
      where: { id: Number(id) },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug.trim() }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
    revalidatePath("/admin/signage");
    revalidatePath("/screen");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update screen" };
  }
}

export async function deleteScreenAction(id: string) {
  try {
    await requireAdmin();
    await prisma.$transaction([
      prisma.signageScheduleSlot.deleteMany({ where: { screen_id: Number(id) } }),
      prisma.signageScreen.delete({ where: { id: Number(id) } }),
    ]);
    revalidatePath("/admin/signage");
    revalidatePath("/screen");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete screen" };
  }
}

export async function fetchMediaAction(): Promise<SignageMedia[]> {
  const rows = await prisma.signageMedia.findMany({
    include: { file: true },
    orderBy: { id: "desc" },
  });
  return rows.map(shapeMedia);
}

export async function createMediaAction(data: {
  name: string;
  type: "pdf" | "video" | "image";
  file: string;
}) {
  try {
    await requireAdmin();
    const created = await prisma.signageMedia.create({
      data: { name: data.name, type: data.type, file_id: data.file },
      include: { file: true },
    });
    revalidatePath("/admin/signage");
    return { success: true, data: shapeMedia(created) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create media" };
  }
}

export async function deleteMediaAction(id: string) {
  try {
    await requireAdmin();
    await prisma.$transaction([
      prisma.signageScheduleSlot.deleteMany({ where: { file_id: Number(id) } }),
      prisma.signageMedia.delete({ where: { id: Number(id) } }),
    ]);
    revalidatePath("/admin/signage");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete media" };
  }
}

export async function fetchScheduleSlotsAction(
  screenId: string
): Promise<SignageScheduleSlot[]> {
  const rows = await prisma.signageScheduleSlot.findMany({
    where: { screen_id: Number(screenId) },
    include: { screen: true, file: { include: { file: true } } },
    orderBy: { start_time: "asc" },
  });
  return rows.map(shapeSlot);
}

export async function createScheduleSlotAction(data: {
  screen: string;
  media: string;
  start_time: string;
  end_time: string;
}) {
  try {
    await requireAdmin();
    const created = await prisma.signageScheduleSlot.create({
      data: {
        screen_id: Number(data.screen),
        file_id: Number(data.media),
        start_time: timeValue(data.start_time),
        end_time: timeValue(data.end_time),
      },
      include: { screen: true, file: { include: { file: true } } },
    });
    revalidatePath("/admin/signage");
    return { success: true, data: shapeSlot(created) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create slot" };
  }
}

export async function updateScheduleSlotAction(
  id: string,
  data: Partial<{ media: string; start_time: string; end_time: string }>
) {
  try {
    await requireAdmin();
    await prisma.signageScheduleSlot.update({
      where: { id: Number(id) },
      data: {
        ...(data.media !== undefined && { file_id: Number(data.media) }),
        ...(data.start_time !== undefined && { start_time: timeValue(data.start_time) }),
        ...(data.end_time !== undefined && { end_time: timeValue(data.end_time) }),
      },
    });
    revalidatePath("/admin/signage");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update slot" };
  }
}

export async function deleteScheduleSlotAction(id: string) {
  try {
    await requireAdmin();
    await prisma.signageScheduleSlot.delete({ where: { id: Number(id) } });
    revalidatePath("/admin/signage");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete slot" };
  }
}

export async function fetchScreenBySlugAction(slug: string) {
  const screen = await prisma.signageScreen.findFirst({
    where: { slug: slug.trim(), status: "published" },
  });
  if (!screen) return null;
  const slots = await prisma.signageScheduleSlot.findMany({
    where: { screen_id: screen.id },
    include: { screen: true, file: { include: { file: true } } },
    orderBy: { start_time: "asc" },
  });
  return {
    screen: { ...screen, id: String(screen.id) } as SignageScreen,
    slots: slots.map(shapeSlot),
  };
}
