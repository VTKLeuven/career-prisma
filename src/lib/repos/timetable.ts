// lib/repos/timetable.ts
"use server";

import { prisma } from "@/lib/prisma";
import { SPEAKER_INCLUDE, shapeTimetable } from "@/lib/repos/_shape";
import type { TimeSlot } from "@/lib/schema";

/** Converts an "HH:mm[:ss]" string (or Date) to a Date for a `@db.Time` column. */
function timeValue(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (value instanceof Date) return value;
  const match = String(value).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) throw new Error(`Invalid time: ${String(value)}`);
  const [, hour, minute, second = "00"] = match;
  return new Date(`1970-01-01T${hour.padStart(2, "0")}:${minute}:${second}.000Z`);
}

const TIMETABLE_INCLUDE = {
  speaker: { include: SPEAKER_INCLUDE },
} as const;

export async function listTimetables(opts?: { limit?: number }): Promise<TimeSlot[]> {
  try {
    const rows = await prisma.timetable.findMany({
      include: TIMETABLE_INCLUDE,
      orderBy: [{ start_time: "asc" }, { id: "asc" }],
      take: opts?.limit ?? 500,
    });
    return rows.map(shapeTimetable) as TimeSlot[];
  } catch (error) {
    console.error("[listTimetables]", error);
    return [];
  }
}

function toTimetableWrite(payload: Record<string, any>): Record<string, unknown> {
  const {
    id: _id,
    start_time,
    end_time,
    speaker,
    speaker_id,
    type,
    events: _events,
    ...rest
  } = payload;

  const speakerRef = speaker_id ?? speaker;

  return {
    ...rest,
    ...(start_time !== undefined ? { start_time: timeValue(start_time) } : {}),
    ...(end_time !== undefined ? { end_time: timeValue(end_time) } : {}),
    ...(type !== undefined ? { type: Array.isArray(type) ? type : type ?? null } : {}),
    ...(speakerRef !== undefined
      ? { speaker_id: speakerRef ? Number(speakerRef) : null }
      : {}),
  };
}

export async function createTimetable(payload: Record<string, any>): Promise<TimeSlot> {
  const row = await prisma.timetable.create({
    data: { ...toTimetableWrite(payload), date_created: new Date() },
    include: TIMETABLE_INCLUDE,
  });
  return shapeTimetable(row) as TimeSlot;
}

export async function updateTimetable(id: number, payload: Record<string, any>): Promise<TimeSlot> {
  const row = await prisma.timetable.update({
    where: { id },
    data: toTimetableWrite(payload),
    include: TIMETABLE_INCLUDE,
  });
  return shapeTimetable(row) as TimeSlot;
}

/** Removes the timetable and its event-page links. Blocks if a speaker references it. */
export async function deleteTimetable(id: number): Promise<void> {
  await prisma.$transaction([
    prisma.careerEventPageTimetable.deleteMany({ where: { timetable_id: id } }),
    prisma.timetableCareerEventPage.deleteMany({ where: { timetable_id: id } }),
    prisma.timetable.delete({ where: { id } }),
  ]);
}
