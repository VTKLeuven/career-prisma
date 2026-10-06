// lib/repos/signage.ts -- digital signage: screens, media and schedule slots.
import "server-only";

import prisma from "@/lib/prisma";
import type { SignageMedia, SignageScheduleSlot, SignageScreen } from "@/lib/schema";

/** "HH:MM" or "HH:MM:SS" as the TIME column's Date (on 1970-01-01, UTC). */
function timeValue(value: string): Date {
  const normalized = /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  return new Date(`1970-01-01T${normalized}Z`);
}

function formatTime(value: Date | null): string {
  return value?.toISOString().slice(11, 16) || "";
}

type MediaRow = {
  id: number;
  name: string | null;
  type: string | null;
  file_id: string | null;
  file?: { id: string; filename_download: string; type: string | null } | null;
};

function shapeMedia(row: MediaRow): SignageMedia {
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

const SLOT_INCLUDE = { screen: true, file: { include: { file: true } } } as const;

type SlotRow = {
  id: number;
  screen_id: number | null;
  start_time: Date | null;
  end_time: Date | null;
  screen?: Record<string, unknown> | null;
  file?: MediaRow | null;
};

function shapeSlot(row: SlotRow): SignageScheduleSlot {
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
  } as SignageScheduleSlot;
}

function shapeScreen<T extends { id: number }>(row: T): SignageScreen {
  return { ...row, id: String(row.id) } as unknown as SignageScreen;
}

/* ---------------------------------- screens ---------------------------------- */

export async function listScreens(opts: { publishedOnly?: boolean } = {}): Promise<SignageScreen[]> {
  const rows = await prisma.signageScreen.findMany({
    where: opts.publishedOnly ? { status: "published" } : undefined,
    orderBy: { name: "asc" },
  });
  return rows.map(shapeScreen);
}

export async function createScreen(data: { name: string; slug: string }): Promise<SignageScreen> {
  const created = await prisma.signageScreen.create({
    data: { name: data.name, slug: data.slug.trim(), status: "published" },
  });
  return shapeScreen(created);
}

export async function updateScreen(id: string, data: Partial<SignageScreen>): Promise<void> {
  await prisma.signageScreen.update({
    where: { id: Number(id) },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug.trim() }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
}

/** Removes the screen and its schedule. */
export async function deleteScreen(id: string): Promise<void> {
  await prisma.$transaction([
    prisma.signageScheduleSlot.deleteMany({ where: { screen_id: Number(id) } }),
    prisma.signageScreen.delete({ where: { id: Number(id) } }),
  ]);
}

/** A published screen and its schedule, for the public viewer. */
export async function getPublishedScreenBySlug(slug: string) {
  const screen = await prisma.signageScreen.findFirst({
    where: { slug: slug.trim(), status: "published" },
  });
  if (!screen) return null;
  const slots = await prisma.signageScheduleSlot.findMany({
    where: { screen_id: screen.id },
    include: SLOT_INCLUDE,
    orderBy: { start_time: "asc" },
  });
  return { screen: shapeScreen(screen), slots: slots.map(shapeSlot) };
}

/* ----------------------------------- media ----------------------------------- */

export async function listMedia(): Promise<SignageMedia[]> {
  const rows = await prisma.signageMedia.findMany({
    include: { file: true },
    orderBy: { id: "desc" },
  });
  return rows.map(shapeMedia);
}

export async function createMedia(data: { name: string; type: string; file: string }): Promise<SignageMedia> {
  const created = await prisma.signageMedia.create({
    data: { name: data.name, type: data.type, file_id: data.file },
    include: { file: true },
  });
  return shapeMedia(created);
}

/** Removes the media item and every slot that shows it. */
export async function deleteMedia(id: string): Promise<void> {
  await prisma.$transaction([
    prisma.signageScheduleSlot.deleteMany({ where: { file_id: Number(id) } }),
    prisma.signageMedia.delete({ where: { id: Number(id) } }),
  ]);
}

/* ------------------------------- schedule slots ------------------------------- */

export async function listScheduleSlots(screenId: string): Promise<SignageScheduleSlot[]> {
  const rows = await prisma.signageScheduleSlot.findMany({
    where: { screen_id: Number(screenId) },
    include: SLOT_INCLUDE,
    orderBy: { start_time: "asc" },
  });
  return rows.map(shapeSlot);
}

export async function createScheduleSlot(data: {
  screen: string;
  media: string;
  start_time: string;
  end_time: string;
}): Promise<SignageScheduleSlot> {
  const created = await prisma.signageScheduleSlot.create({
    data: {
      screen_id: Number(data.screen),
      file_id: Number(data.media),
      start_time: timeValue(data.start_time),
      end_time: timeValue(data.end_time),
    },
    include: SLOT_INCLUDE,
  });
  return shapeSlot(created);
}

export async function updateScheduleSlot(
  id: string,
  data: Partial<{ media: string; start_time: string; end_time: string }>
): Promise<void> {
  await prisma.signageScheduleSlot.update({
    where: { id: Number(id) },
    data: {
      ...(data.media !== undefined && { file_id: Number(data.media) }),
      ...(data.start_time !== undefined && { start_time: timeValue(data.start_time) }),
      ...(data.end_time !== undefined && { end_time: timeValue(data.end_time) }),
    },
  });
}

export async function deleteScheduleSlot(id: string): Promise<void> {
  await prisma.signageScheduleSlot.delete({ where: { id: Number(id) } });
}
