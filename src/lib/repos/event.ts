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
import { assertAcademicYearWritable, resolveAcademicYearId } from "@/lib/repos/academic-year";

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
    ...(payload.academic_year_id !== undefined
      ? { academic_year_id: payload.academic_year_id ? Number(payload.academic_year_id) : null }
      : {}),
    ...(payload.name !== undefined && payload.series_key === undefined
      ? { series_key: slugifyEventName(String(payload.name)) }
      : {}),
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
  const academicYearId = await assertAcademicYearWritable(
    await resolveAcademicYearId(payload.academic_year_id)
  );
  const seriesKey = payload.series_key || slugifyEventName(String(payload.name ?? ""));
  if (!seriesKey) throw new Error("Event name is required");

  const existingSeries = await prisma.careerEvent.findFirst({
    where: {
      OR: [
        { series_key: seriesKey },
        { name: { equals: String(payload.name ?? ""), mode: "insensitive" } },
      ],
    },
    include: { academicYear: true },
  });
  if (existingSeries) {
    throw new Error(
      `“${existingSeries.name}” is an existing event series`
      + `${existingSeries.academicYear?.name ? ` (${existingSeries.academicYear.name})` : ""}. `
      + "Use ‘Create annual editions’ on the Events page instead."
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.careerEvent.create({
      data: {
        ...toEventWrite(payload),
        academic_year_id: academicYearId,
        series_key: seriesKey,
        date_created: new Date(),
      },
      include: { academicYear: true },
    });
    await tx.careerEventPage.create({
      data: {
        event_id: created.id,
        status: "draft",
        description_EN: "",
      },
    });
    return created;
  });
  return shapeCareerEvent(row) as CareerEvent;
}

export async function updateEvent(id: string, payload: Record<string, any>): Promise<CareerEvent> {
  const existing = await prisma.careerEvent.findUnique({
    where: { id },
    select: { academic_year_id: true },
  });
  if (!existing) throw new Error("Event not found");
  if (existing.academic_year_id != null) await assertAcademicYearWritable(existing.academic_year_id);
  if (payload.academic_year_id !== undefined) {
    const targetYearId = await assertAcademicYearWritable(payload.academic_year_id);
    if (existing.academic_year_id != null && targetYearId !== existing.academic_year_id) {
      throw new Error("An event cannot be moved to another academic year; copy it instead");
    }
  }
  const row = await prisma.careerEvent.update({
    where: { id },
    data: { ...toEventWrite(payload), date_updated: new Date() },
    include: { academicYear: true },
  });
  return shapeCareerEvent(row) as CareerEvent;
}

/** Removes the event and its option links. Blocks if event pages/matching/schedules exist. */
export async function deleteEvent(id: string): Promise<void> {
  const event = await prisma.careerEvent.findUnique({
    where: { id },
    select: { academic_year_id: true },
  });
  if (!event) return;
  if (event.academic_year_id != null) await assertAcademicYearWritable(event.academic_year_id);
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
  academicYearId?: string | number;
  includeHistory?: boolean;
}) {
  try {
    const { search, limit = 25, page = 1, sort = "date", includeHistory = false } = opts ?? {};
    const academicYearId = includeHistory
      ? undefined
      : await resolveAcademicYearId(opts?.academicYearId);
    const desc = sort.startsWith("-");
    const sortField = desc ? sort.slice(1) : sort;

    const rows = await prisma.careerEvent.findMany({
      where: {
        ...(academicYearId ? { academic_year_id: academicYearId } : {}),
        ...(search ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          } : {}),
      },
      include: {
        academicYear: true,
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
  academicYearId?: string | number;
  includeHistory?: boolean;
}) {
  try {
    const { limit = 25, page = 1, sort = "event.date" } = opts ?? {};
    const academicYearId = opts?.academicYearId != null
      ? await resolveAcademicYearId(opts.academicYearId)
      : undefined;

    const rows = await prisma.careerEventPage.findMany({
      where: {
        status: "published",
        ...(academicYearId ? { event: { academic_year_id: academicYearId } } : {}),
      },
      include: EVENT_PAGE_INCLUDE,
      take: 1000,
    });

    const allPublished = rows.map(shapeEventPage) as CareerEventPage[];
    // Keep one public page per stable event series. A draft next edition does
    // not replace the last published edition, so the URL never goes dark at
    // the academic-year boundary.
    const newestFirst = [...allPublished].sort((a, b) => {
      const yearA = new Date(a.event?.academic_year?.start_of_year ?? 0).getTime();
      const yearB = new Date(b.event?.academic_year?.start_of_year ?? 0).getTime();
      if (yearA !== yearB) return yearB - yearA;
      return new Date(b.event?.date ?? 0).getTime() - new Date(a.event?.date ?? 0).getTime();
    });
    const seenSeries = new Set<string>();
    const list = newestFirst.filter((item) => {
      const series = item.event?.series_key || slugifyEventName(item.event?.name ?? "");
      if (seenSeries.has(series)) return false;
      seenSeries.add(series);
      return true;
    });

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

    return list.slice((page - 1) * limit, page * limit);
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
      include: { academicYear: true },
      orderBy: [{ academicYear: { start_of_year: "desc" } }, { date: "desc" }],
      take: 500,
    });

    const normalizedSlug = slugifyEventName(slug);
    const matchingEvents = events.filter(
      (event) => event.series_key === normalizedSlug || slugifyEventName(event.name ?? "") === normalizedSlug
    );

    if (!matchingEvents.length) return null;

    const pages = await prisma.careerEventPage.findMany({
      where: {
        event_id: { in: matchingEvents.map((event) => event.id) },
        status: "published",
      },
      include: EVENT_PAGE_INCLUDE,
      orderBy: { id: "desc" },
    });
    const pageByEvent = new Map<string, (typeof pages)[number]>();
    for (const page of pages) {
      if (page.event_id && !pageByEvent.has(page.event_id)) pageByEvent.set(page.event_id, page);
    }
    const row = matchingEvents.map((event) => pageByEvent.get(event.id)).find(Boolean);

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
