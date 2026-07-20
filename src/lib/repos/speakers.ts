// lib/repos/speakers.ts
"use server";

import { prisma } from "@/lib/prisma";
import { SPEAKER_INCLUDE, shapeSpeaker } from "@/lib/repos/_shape";
import type { Speaker } from "@/lib/schema";

export async function listSpeakers(opts?: { limit?: number }): Promise<Speaker[]> {
  try {
    const rows = await prisma.speaker.findMany({
      include: SPEAKER_INCLUDE,
      orderBy: { id: "asc" },
      take: opts?.limit ?? 500,
    });
    return rows.map(shapeSpeaker) as Speaker[];
  } catch (error) {
    console.error("[listSpeakers]", error);
    return [];
  }
}

function toSpeakerWrite(payload: Record<string, any>): Record<string, unknown> {
  const {
    id: _id,
    representative,
    representative_id,
    time,
    time_id,
    ...rest
  } = payload;

  const repRef = representative_id ?? representative;
  const timeRef = time_id ?? time;

  return {
    ...rest,
    ...(repRef !== undefined ? { representative_id: repRef || null } : {}),
    ...(timeRef !== undefined ? { time_id: timeRef ? Number(timeRef) : null } : {}),
  };
}

export async function createSpeaker(payload: Record<string, any>): Promise<Speaker> {
  const row = await prisma.speaker.create({
    data: { ...toSpeakerWrite(payload), date_created: new Date() },
    include: SPEAKER_INCLUDE,
  });
  return shapeSpeaker(row) as Speaker;
}

export async function updateSpeaker(id: number, payload: Record<string, any>): Promise<Speaker> {
  const row = await prisma.speaker.update({
    where: { id },
    data: { ...toSpeakerWrite(payload), date_updated: new Date() },
    include: SPEAKER_INCLUDE,
  });
  return shapeSpeaker(row) as Speaker;
}

/** Removes the speaker plus its event-page links, detaching any timetable that points at it. */
export async function deleteSpeaker(id: number): Promise<void> {
  await prisma.$transaction([
    prisma.careerEventPageSpeaker.deleteMany({ where: { speaker_id: id } }),
    prisma.timetable.updateMany({ where: { speaker_id: id }, data: { speaker_id: null } }),
    prisma.speaker.delete({ where: { id } }),
  ]);
}
