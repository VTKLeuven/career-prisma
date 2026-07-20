// lib/repos/event.ts
"use server"

import { prisma } from "@/lib/prisma";
import {
  EVENT_PAGE_INCLUDE,
  SPEAKER_INCLUDE,
  shapeCareerEvent,
  shapeCareerEventOption,
  shapeEventPage,
  shapeSpeaker,
} from "@/lib/repos/_shape";
import type { CareerEvent, CareerEventPage } from "@/lib/schema";
import { slugifyEventName } from "@/lib/utils/slugify";

/** Converts a "YYYY-MM-DD" string (or Date) to a Date for a `@db.Date` column. */
function dateValue(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (value instanceof Date) return value;
  const text = String(value).slice(0, 10);
  const d = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${String(value)}`);
  return d;
}

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

function toEventWrite(payload: Record<string, any>): Record<string, unknown> {
  const { id: _id, image, date, start_hour, end_hour, href: _href, options: _options, ...rest } = payload;
  return {
    ...rest,
    ...(payload.num_of_companies !== undefined
      ? { num_of_companies: payload.num_of_companies == null || payload.num_of_companies === "" ? null : Number(payload.num_of_companies) }
      : {}),
    ...(payload.num_of_students !== undefined
      ? { num_of_students: payload.num_of_students == null || payload.num_of_students === "" ? null : Number(payload.num_of_students) }
      : {}),
    ...(image !== undefined ? { image_id: image || null } : {}),
    ...(date !== undefined ? { date: dateValue(date) } : {}),
    ...(start_hour !== undefined ? { start_hour: timeValue(start_hour) } : {}),
    ...(end_hour !== undefined ? { end_hour: timeValue(end_hour) } : {}),
  };
}

export async function createEvent(payload: Record<string, any>): Promise<CareerEvent> {
  const row = await prisma.careerEvent.create({
    data: { ...toEventWrite(payload), date_created: new Date() },
  });
  return shapeCareerEvent(row) as CareerEvent;
}

export async function updateEvent(id: string, payload: Record<string, any>): Promise<CareerEvent> {
  const row = await prisma.careerEvent.update({
    where: { id },
    data: { ...toEventWrite(payload), date_updated: new Date() },
  });
  return shapeCareerEvent(row) as CareerEvent;
}

/** Removes the event and its option links. Blocks if event pages/matching/schedules exist. */
export async function deleteEvent(id: string): Promise<void> {
  await prisma.$transaction([
    prisma.careerEventOptionEvent.deleteMany({ where: { career_event_id: id } }),
    prisma.careerEvent.delete({ where: { id } }),
  ]);
}

export async function listEvents(opts?: {
  search?: string;
  limit?: number;
  page?: number;        // 1-based
  sort?: string;        // e.g. "-date_created" or "name"
}) {
  try {
    const { search, limit = 25, page = 1, sort = "date" } = opts ?? {};
    const desc = sort.startsWith("-");
    const sortField = desc ? sort.slice(1) : sort;

    const rows = await prisma.careerEvent.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        careerEventOptionEvents: {
          include: {
            careerEventOption: {
              include: {
                careerEventOptionEvents: { include: { careerEvent: true } },
                careerEventOptionSubOptions: { include: { careerSubOption: true } },
              },
            },
          },
        },
      },
      orderBy: { [sortField]: desc ? "desc" : "asc" },
      take: limit,
      skip: (page - 1) * limit,
    });

    return rows.map((row) => {
      const { careerEventOptionEvents } = row as Record<string, any>;
      return {
        ...shapeCareerEvent(row),
        options: (careerEventOptionEvents ?? [])
          .map((j: any) => j.careerEventOption)
          .filter(Boolean)
          .map((o: any) => ({ career_event_option_id: shapeCareerEventOption(o) })),
      };
    }) as unknown as CareerEvent[];
  } catch (error) {
    console.log(error);
  }
}

export async function listEventPages(opts?: {
  search?: string;
  limit?: number;
  page?: number;
  sort?: string; // e.g. "event.date" or "-event.date"
}) {
  try {
    const { limit = 25, page = 1, sort = "event.date" } = opts ?? {};

    const rows = await prisma.careerEventPage.findMany({
      include: EVENT_PAGE_INCLUDE,
      take: limit,
      skip: (page - 1) * limit,
    });

    const list = rows.map(shapeEventPage) as CareerEventPage[];

    // Sorting stays in JS: the default sort key is a nested path ("event.date")
    // that the callers pass as a string, exactly as before.
    if (sort) {
      const desc = sort.startsWith("-");
      const fieldPath = desc ? sort.slice(1) : sort;

      list.sort((a, b) => {
        const getField = (obj: Record<string, unknown>, path: string): unknown =>
          path.split(".").reduce((o, key) => o?.[key] as Record<string, unknown>, obj as Record<string, unknown>);

        const valA = getField(a as unknown as Record<string, unknown>, fieldPath);
        const valB = getField(b as unknown as Record<string, unknown>, fieldPath);

        const timeA = valA ? new Date(valA as string | number).getTime() : 0;
        const timeB = valB ? new Date(valB as string | number).getTime() : 0;

        return desc ? timeB - timeA : timeA - timeB;
      });
    }

    return list;
  } catch (error) {
    console.error("Error fetching event pages:", error);
    return [];
  }
}

export async function getEventPageById(id: string): Promise<CareerEventPage | null> {
  try {
    const row = await prisma.careerEventPage.findUnique({
      where: { id: Number(id) },
      include: { event: true, floorplan: true },
    });
    return shapeEventPage(row) as CareerEventPage | null;
  } catch (error) {
    console.error("Error fetching event page by ID:", error);
    return null;
  }
}

export async function getEventPageBySlug(slug: string): Promise<CareerEventPage | null> {
  try {
    // The slug is derived from the event name, so the match cannot be pushed
    // into SQL: every candidate name has to be slugified and compared.
    const events = await prisma.careerEvent.findMany({
      select: { id: true, name: true },
      take: 100,
    });

    const normalizedSlug = slugifyEventName(slug);
    const matchingEvent = events.find(
      (event) => slugifyEventName(event.name ?? "") === normalizedSlug
    );

    if (!matchingEvent) return null;

    const row = await prisma.careerEventPage.findFirst({
      where: { event_id: matchingEvent.id },
      include: EVENT_PAGE_INCLUDE,
    });

    return shapeEventPage(row) as CareerEventPage | null;
  } catch (error) {
    console.error("Error fetching event page by slug:", error);
    return null;
  }
}

/** Speaker with event name for company page display */
export type SpeakerWithEvent = import("@/lib/schema").Speaker & { eventName: string };

/**
 * Get all speakers for a company (representatives of this company who speak at
 * events). Previously this fetched every event page and filtered in JS; the
 * company link is a plain join through speaker -> representative -> company.
 */
export async function getSpeakersForCompany(companyId: string): Promise<SpeakerWithEvent[]> {
  try {
    const links = await prisma.careerEventPageSpeaker.findMany({
      where: { speaker: { representative: { company_id: companyId } } },
      include: {
        careerEventPage: { include: { event: { select: { name: true } } } },
        speaker: { include: SPEAKER_INCLUDE },
      },
    });

    return links
      .filter((l) => l.speaker)
      .map((l) => ({
        ...shapeSpeaker(l.speaker),
        eventName: l.careerEventPage?.event?.name ?? "",
      })) as SpeakerWithEvent[];
  } catch (error) {
    console.error("Error fetching speakers for company:", error);
    return [];
  }
}
