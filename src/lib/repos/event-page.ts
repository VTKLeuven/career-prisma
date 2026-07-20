// lib/repos/event-page.ts
"use server";

import { prisma } from "@/lib/prisma";

export type AdminEventPageRow = {
  id: string;
  event_id: string | null;
  event_name: string | null;
  status: string;
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
};

const ADMIN_INCLUDE = {
  event: { select: { id: true, name: true } },
  careerEventPageCompanies: { select: { company_id: true } },
  careerEventPageSpeakers: { select: { speaker_id: true } },
  careerEventPageTimetables: { select: { timetable_id: true } },
} as const;

function toRow(row: Record<string, any>): AdminEventPageRow {
  return {
    id: String(row.id),
    event_id: row.event_id ?? null,
    event_name: row.event?.name ?? null,
    status: row.status ?? "draft",
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
    floorplan_id,
    latitude,
    longitude,
    header_buttons,
    companyIds: _companyIds,
    speakerIds: _speakerIds,
    timetableIds: _timetableIds,
    event_name: _event_name,
    ...rest
  } = payload;

  return {
    ...rest,
    ...(image !== undefined ? { image_id: image || null } : {}),
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
  if (Array.isArray(payload.timetableIds)) await setTimetables(pageId, payload.timetableIds.map(String));
}

export async function createEventPage(payload: Record<string, any>): Promise<AdminEventPageRow> {
  const created = await prisma.careerEventPage.create({
    data: { ...toEventPageWrite(payload), description_EN: payload.description_EN ?? "" },
  });
  await applyRelations(created.id, payload);
  return (await getRow(created.id))!;
}

export async function updateEventPage(id: number, payload: Record<string, any>): Promise<AdminEventPageRow> {
  await prisma.careerEventPage.update({ where: { id }, data: toEventPageWrite(payload) });
  await applyRelations(id, payload);
  return (await getRow(id))!;
}

export async function deleteEventPage(id: number): Promise<void> {
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
