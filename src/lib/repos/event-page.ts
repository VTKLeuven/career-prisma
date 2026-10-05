// lib/repos/event-page.ts
import "server-only";

import { prisma } from "@/lib/prisma";
import { createTimetable, updateTimetable } from "@/lib/repos/timetable";
import { assertAcademicYearWritable } from "@/lib/repos/academic-year";
import { invalidateEventPageCache } from "@/lib/event-page-cache";
import { toSitePath } from "@/lib/site-path";

export type AdminEventPageTimetableItem = {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  icon: string;
  type: string[];
  speaker_id: string;
};

export type AdminEventPageRow = {
  id: string;
  event_id: string | null;
  event_name: string | null;
  academic_year_id: string | null;
  academic_year_name: string | null;
  /** The owning event's status. Editing it here writes through to the event. */
  event_status: string;
  shout: string | null;
  tagline: string | null;
  description_EN: string | null;
  address: string | null;
  parking: string | null;
  registration_link: string | null;
  floorplan_id: string | null;
  image: string | null;
  company_guide: string | null;
  header_buttons: string[];
  latitude: number | null;
  longitude: number | null;
  companyIds: string[];
  speakerIds: string[];
  timetableIds: string[];
  timetableItems: AdminEventPageTimetableItem[];
};

const ADMIN_INCLUDE = {
  event: { include: { academicYear: true } },
  careerEventPageCompanies: { select: { company_id: true } },
  careerEventPageSpeakers: { select: { speaker_id: true } },
  careerEventPageTimetables: {
    include: { timetable: true },
    orderBy: { timetable: { start_time: "asc" } },
  },
} as const;

function timeString(value: unknown): string {
  if (!(value instanceof Date)) return value ? String(value).slice(0, 5) : "";
  return value.toISOString().slice(11, 16);
}

function timetableItem(row: Record<string, any>): AdminEventPageTimetableItem | null {
  const slot = row.timetable;
  if (!slot) return null;
  return {
    id: String(slot.id),
    title: slot.title ?? "",
    description: slot.description ?? "",
    start_time: timeString(slot.start_time),
    end_time: timeString(slot.end_time),
    icon: slot.icon ?? "",
    type: Array.isArray(slot.type) ? slot.type.map(String) : [],
    speaker_id: slot.speaker_id != null ? String(slot.speaker_id) : "",
  };
}

function toRow(row: Record<string, any>): AdminEventPageRow {
  return {
    id: String(row.id),
    event_id: row.event_id ?? null,
    event_name: row.event?.name ?? null,
    academic_year_id: row.event?.academic_year_id != null ? String(row.event.academic_year_id) : null,
    academic_year_name: row.event?.academicYear?.name ?? null,
    event_status: row.event?.status ?? "draft",
    shout: row.shout ?? null,
    tagline: row.tagline ?? null,
    description_EN: row.description_EN ?? null,
    address: row.address ?? null,
    parking: row.parking ?? null,
    registration_link: row.registration_link ?? null,
    floorplan_id: row.floorplan_id != null ? String(row.floorplan_id) : null,
    image: row.image_id ?? null,
    company_guide: row.company_guide ?? null,
    header_buttons: Array.isArray(row.header_buttons) ? row.header_buttons : [],
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    companyIds: (row.careerEventPageCompanies ?? [])
      .map((j: any) => j.company_id)
      .filter(Boolean)
      .map(String),
    speakerIds: (row.careerEventPageSpeakers ?? [])
      .map((j: any) => j.speaker_id)
      .filter((v: unknown) => v != null)
      .map(String),
    timetableIds: (row.careerEventPageTimetables ?? [])
      .map((j: any) => j.timetable_id)
      .filter((v: unknown) => v != null)
      .map(String),
    timetableItems: (row.careerEventPageTimetables ?? [])
      .map(timetableItem)
      .filter((item: AdminEventPageTimetableItem | null): item is AdminEventPageTimetableItem => item !== null),
  };
}

export async function listEventPagesAdmin(): Promise<AdminEventPageRow[]> {
  const rows = await prisma.careerEventPage.findMany({
    include: ADMIN_INCLUDE,
    orderBy: { id: "desc" },
  });
  return rows.map(toRow);
}

/** id + name/year for floorplan dropdowns. */
export async function listFloorplansBasic(): Promise<{ id: number; name: string | null; year: string | null }[]> {
  return prisma.floorplan.findMany({
    select: { id: true, name: true, year: true },
    orderBy: { id: "desc" },
  });
}

function toEventPageWrite(payload: Record<string, any>): Record<string, unknown> {
  const {
    id: _id,
    image,
    event_id,
    event_status: _event_status,
    company_guide,
    floorplan_id,
    latitude,
    longitude,
    header_buttons,
    companyIds: _companyIds,
    speakerIds: _speakerIds,
    timetableIds: _timetableIds,
    timetableItems: _timetableItems,
    event_name: _event_name,
    registration_link,
    ...rest
  } = payload;

  // The admin form sends every field on every save, and renders an unset
  // relation as "". Postgres rejects "" for a uuid column, so the uuid-typed
  // columns (event_id, image_id, company_guide) have to be nulled explicitly.
  return {
    ...rest,
    ...(registration_link !== undefined
      ? { registration_link: registration_link ? toSitePath(String(registration_link)) || null : null }
      : {}),
    ...(image !== undefined ? { image_id: image || null } : {}),
    ...(event_id !== undefined ? { event_id: event_id || null } : {}),
    ...(company_guide !== undefined ? { company_guide: company_guide || null } : {}),
    ...(floorplan_id !== undefined
      ? { floorplan_id: floorplan_id ? Number(floorplan_id) : null }
      : {}),
    ...(latitude !== undefined ? { latitude: latitude === "" || latitude == null ? null : Number(latitude) } : {}),
    ...(longitude !== undefined ? { longitude: longitude === "" || longitude == null ? null : Number(longitude) } : {}),
    ...(header_buttons !== undefined
      ? { header_buttons: Array.isArray(header_buttons) ? header_buttons : [] }
      : {}),
  };
}

async function setCompanies(pageId: number, companyIds: string[]): Promise<void> {
  const ids = [...new Set(companyIds.filter(Boolean))];
  await prisma.$transaction([
    prisma.careerEventPageCompany.deleteMany({ where: { career_event_page_id: pageId } }),
    ...(ids.length
      ? [prisma.careerEventPageCompany.createMany({
          data: ids.map((company_id) => ({ career_event_page_id: pageId, company_id })),
        })]
      : []),
  ]);
}

async function setSpeakers(pageId: number, speakerIds: string[]): Promise<void> {
  const ids = [...new Set(speakerIds.map(Number).filter(Number.isFinite))];
  await prisma.$transaction([
    prisma.careerEventPageSpeaker.deleteMany({ where: { career_event_page_id: pageId } }),
    ...(ids.length
      ? [prisma.careerEventPageSpeaker.createMany({
          data: ids.map((speaker_id) => ({ career_event_page_id: pageId, speaker_id })),
        })]
      : []),
  ]);
}

async function setTimetables(pageId: number, timetableIds: string[]): Promise<void> {
  const ids = [...new Set(timetableIds.map(Number).filter(Number.isFinite))];
  await prisma.$transaction([
    prisma.careerEventPageTimetable.deleteMany({ where: { career_event_page_id: pageId } }),
    ...(ids.length
      ? [prisma.careerEventPageTimetable.createMany({
          data: ids.map((timetable_id) => ({ career_event_page_id: pageId, timetable_id })),
        })]
      : []),
  ]);
}

async function applyRelations(pageId: number, payload: Record<string, any>): Promise<void> {
  if (Array.isArray(payload.companyIds)) await setCompanies(pageId, payload.companyIds.map(String));
  if (Array.isArray(payload.speakerIds)) await setSpeakers(pageId, payload.speakerIds.map(String));
  if (!Array.isArray(payload.timetableItems) && Array.isArray(payload.timetableIds)) {
    await setTimetables(pageId, payload.timetableIds.map(String));
  }
}

/**
 * The page form edits two columns that live on the event: its name and its
 * status. The status is the only draft flag there is, so publishing from this
 * screen has to reach the event row.
 */
async function updateEventFields(
  eventId: string | null,
  payload: Record<string, any>
): Promise<void> {
  if (!eventId) return;
  const data: Record<string, unknown> = {};

  // A newly-created page starts with an empty form value; in that case retain
  // the selected event's existing name instead of overwriting it.
  const name = payload.event_name === undefined ? "" : String(payload.event_name).trim();
  if (name) data.name = name;

  if (payload.event_status !== undefined) {
    data.status = String(payload.event_status) === "published" ? "published" : "draft";
  }

  if (!Object.keys(data).length) return;
  await prisma.careerEvent.update({
    where: { id: eventId },
    data: { ...data, date_updated: new Date() },
  });
}

function timetablePayload(item: Record<string, unknown>): Record<string, unknown> {
  return {
    title: item.title,
    description: item.description,
    start_time: item.start_time,
    end_time: item.end_time,
    icon: item.icon,
    type: item.type,
    speaker_id: item.speaker_id,
  };
}

/**
 * Keeps timetable editing scoped to one event page. Existing items must already
 * be linked to this page; client-side temporary ids are created and linked here.
 */
async function syncTimetableItems(pageId: number, value: unknown): Promise<void> {
  if (!Array.isArray(value)) return;

  const currentLinks = await prisma.careerEventPageTimetable.findMany({
    where: { career_event_page_id: pageId },
    select: { timetable_id: true },
  });
  const linkedIds = new Set(
    currentLinks
      .map((link) => link.timetable_id)
      .filter((id): id is number => id != null)
  );
  const savedIds: string[] = [];
  const seenExistingIds = new Set<number>();

  for (const raw of value) {
    const item = raw as Record<string, unknown>;
    const rawId = String(item.id ?? "");
    const existingId = /^\d+$/.test(rawId) ? Number(rawId) : null;

    if (existingId != null) {
      if (!linkedIds.has(existingId)) {
        throw new Error("A timetable element does not belong to this event page");
      }
      if (seenExistingIds.has(existingId)) continue;
      await updateTimetable(existingId, timetablePayload(item));
      seenExistingIds.add(existingId);
      savedIds.push(String(existingId));
      continue;
    }

    if (!rawId.startsWith("new-")) throw new Error("Invalid timetable element");
    const created = await createTimetable(timetablePayload(item));
    savedIds.push(String(created.id));
  }

  await setTimetables(pageId, savedIds);
}

export async function createEventPage(payload: Record<string, any>): Promise<AdminEventPageRow> {
  const event = await prisma.careerEvent.findUnique({
    where: { id: String(payload.event_id ?? "") },
    select: { academic_year_id: true },
  });
  if (!event) throw new Error("Event not found");
  if (event.academic_year_id != null) await assertAcademicYearWritable(event.academic_year_id);
  const created = await prisma.careerEventPage.create({
    data: { ...toEventPageWrite(payload), description_EN: payload.description_EN ?? "" },
  });
  await applyRelations(created.id, payload);
  await updateEventFields(created.event_id, payload);
  await syncTimetableItems(created.id, payload.timetableItems);
  return (await getRow(created.id))!;
}

export async function updateEventPage(id: number, payload: Record<string, any>): Promise<AdminEventPageRow> {
  const existing = await prisma.careerEventPage.findUnique({
    where: { id },
    select: { event: { select: { academic_year_id: true } } },
  });
  if (!existing) throw new Error("Event page not found");
  if (existing.event?.academic_year_id != null) {
    await assertAcademicYearWritable(existing.event.academic_year_id);
  }
  if (payload.event_id) {
    const targetEvent = await prisma.careerEvent.findUnique({
      where: { id: String(payload.event_id) },
      select: { academic_year_id: true },
    });
    if (!targetEvent) throw new Error("Event not found");
    if (targetEvent.academic_year_id != null) {
      await assertAcademicYearWritable(targetEvent.academic_year_id);
    }
  }
  const page = await prisma.careerEventPage.update({ where: { id }, data: toEventPageWrite(payload) });
  await applyRelations(id, payload);
  await updateEventFields(page.event_id, payload);
  await syncTimetableItems(id, payload.timetableItems);
  return (await getRow(id))!;
}

/**
 * Points the event's page(s) at its registration form. Called whenever a form
 * is saved as the event's registration form, so the "Student registration"
 * button follows the form's slug without anyone copying a URL by hand.
 */
export async function setEventRegistrationLink(eventId: string, link: string): Promise<void> {
  const { count } = await prisma.careerEventPage.updateMany({
    where: {
      event_id: eventId,
      // `NOT registration_link = x` alone would skip NULL rows in SQL.
      OR: [{ registration_link: null }, { NOT: { registration_link: link } }],
    },
    data: { registration_link: link },
  });
  if (count > 0) invalidateEventPageCache();
}

export async function deleteEventPage(id: number): Promise<void> {
  const existing = await prisma.careerEventPage.findUnique({
    where: { id },
    select: { event: { select: { academic_year_id: true } } },
  });
  if (!existing) return;
  if (existing.event?.academic_year_id != null) {
    await assertAcademicYearWritable(existing.event.academic_year_id);
  }
  await prisma.$transaction([
    prisma.careerEventPageCompany.deleteMany({ where: { career_event_page_id: id } }),
    prisma.careerEventPageSpeaker.deleteMany({ where: { career_event_page_id: id } }),
    prisma.careerEventPageTimetable.deleteMany({ where: { career_event_page_id: id } }),
    prisma.careerEventPage.delete({ where: { id } }),
  ]);
}

async function getRow(id: number): Promise<AdminEventPageRow | null> {
  const row = await prisma.careerEventPage.findUnique({ where: { id }, include: ADMIN_INCLUDE });
  return row ? toRow(row) : null;
}

/** What the admin event cards show about an event's setup. */
export type EventSetupStatus = {
  hasEventPage: boolean;
  hasFloorplan: boolean;
  hasCompanyGuide: boolean;
  /** The event page's header_buttons, or [] when unset. */
  headerButtons: string[];
  hasCompanies: boolean;
  hasMatchingSoftware: boolean;
  hasSchedules: boolean;
};

/**
 * Setup status for several events in three queries. The admin event cards
 * used to ask per card -- event page, matching software, schedules, and the
 * event page again for its companies -- four server actions each, which Next
 * runs one at a time.
 */
export async function getEventSetupStatuses(eventIds: string[]): Promise<Record<string, EventSetupStatus>> {
  const ids = [...new Set(eventIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const [pages, matching, schedules] = await Promise.all([
    prisma.careerEventPage.findMany({
      where: { event_id: { in: ids } },
      select: {
        event_id: true,
        floorplan_id: true,
        company_guide: true,
        header_buttons: true,
        _count: { select: { careerEventPageCompanies: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.matchingSoftware.findMany({
      where: { event_id: { in: ids } },
      select: { event_id: true },
    }),
    prisma.schedule.findMany({
      where: { event_id: { in: ids } },
      select: { event_id: true },
      distinct: ["event_id"],
    }),
  ]);

  const withMatching = new Set(matching.map((m) => m.event_id));
  const withSchedules = new Set(schedules.map((s) => s.event_id));
  const result: Record<string, EventSetupStatus> = {};
  for (const id of ids) {
    // The first page of the event, as getEventPageWithFloorplan reads it.
    const page = pages.find((p) => p.event_id === id);
    result[id] = {
      hasEventPage: !!page,
      hasFloorplan: page?.floorplan_id != null,
      hasCompanyGuide: !!page?.company_guide,
      headerButtons: Array.isArray(page?.header_buttons) ? (page.header_buttons as string[]) : [],
      hasCompanies: (page?._count.careerEventPageCompanies ?? 0) > 0,
      hasMatchingSoftware: withMatching.has(id),
      hasSchedules: withSchedules.has(id),
    };
  }
  return result;
}

/** Lists companies on an event page (those not on it yet); returns how many were added. */
export async function addCompaniesToEventPage(eventPageId: number, companyIds: string[]): Promise<number> {
  const current = await prisma.careerEventPageCompany.findMany({
    where: { career_event_page_id: eventPageId },
    select: { company_id: true },
  });
  const existing = new Set(current.map((item) => item.company_id).filter(Boolean) as string[]);
  const toAdd = [...new Set(companyIds)].filter((id) => !existing.has(id));
  if (toAdd.length === 0) return 0;
  await prisma.careerEventPageCompany.createMany({
    data: toAdd.map((companyId) => ({ career_event_page_id: eventPageId, company_id: companyId })),
  });
  // The public event page lists them.
  invalidateEventPageCache();
  return toAdd.length;
}

/** Sets an event page's company guide (a file id) and drops the public cache. */
export async function setEventPageCompanyGuide(eventPageId: number, fileId: string): Promise<void> {
  await prisma.careerEventPage.update({
    where: { id: eventPageId },
    data: { company_guide: fileId },
  });
  invalidateEventPageCache();
}
