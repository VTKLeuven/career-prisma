// lib/repos/option.ts
"use server"

import { prisma } from "@/lib/prisma";
import { shapeCareerEventOption } from "@/lib/repos/_shape";
import type { CareerEventOption, CareerSubOption } from "@/lib/schema";
import { assertAcademicYearWritable, resolveAcademicYearId } from "@/lib/repos/academic-year";
import { slugifyEventName } from "@/lib/utils/slugify";

/**
 * Fetch all career event options with their events and sub-options.
 *
 * The Directus version requested three levels of wildcards and kept a fallback
 * query for when the field names turned out to be wrong. The relations are
 * career_event_option -> career_event_option_career_event -> career_event and
 * career_event_option -> career_event_option_career_sub_option ->
 * career_sub_option, so one query covers it.
 */
export async function listCareerEventOptions(opts?: {
  limit?: number;
  academicYearId?: string | number;
  includeHistory?: boolean;
}) {
  try {
    const { limit = 1000, includeHistory = false } = opts ?? {};
    const academicYearId = includeHistory
      ? undefined
      : await resolveAcademicYearId(opts?.academicYearId);

    const rows = await prisma.careerEventOption.findMany({
      where: academicYearId ? { academic_year_id: academicYearId } : undefined,
      include: {
        academicYear: true,
        careerEventOptionEvents: { include: { careerEvent: { include: { academicYear: true } } } },
        careerEventOptionSubOptions: { include: { careerSubOption: true } },
      },
      take: limit,
    });

    return rows.map(shapeCareerEventOption) as CareerEventOption[];
  } catch (error) {
    console.error("Error fetching career event options:", error);
    return null;
  }
}

/**
 * Fetch all career sub-options from career_sub_option collection
 */
export async function listCareerSubOptions(opts?: { limit?: number }): Promise<CareerSubOption[]> {
  try {
    const { limit = 200 } = opts ?? {};
    return (await prisma.careerSubOption.findMany({
      orderBy: { name: "asc" },
      take: limit,
    })) as unknown as CareerSubOption[];
  } catch (error) {
    console.error("[listCareerSubOptions] Error:", error);
    return [];
  }
}

/**
 * Fetch career sub-options by IDs. Handles both:
 * - career_sub_option IDs (when sub_options returns related item IDs)
 * - junction table IDs (when sub_options returns junction IDs)
 *
 * The Directus version probed six possible junction table names because the
 * real one was unknown. It is career_event_option_career_sub_option, mapped
 * here as CareerEventOptionSubOption.
 */
export async function getCareerSubOptionsByIds(ids: (string | number)[]): Promise<CareerSubOption[]> {
  if (ids.length === 0) return [];
  try {
    const numericIds = ids.map((v) => Number(v)).filter((n) => Number.isFinite(n));
    if (numericIds.length === 0) return [];

    const direct = await prisma.careerSubOption.findMany({
      where: { id: { in: numericIds } },
    });
    if (direct.length > 0) return direct as unknown as CareerSubOption[];

    // Nothing matched, so treat the ids as junction row ids instead.
    const viaJunction = await prisma.careerEventOptionSubOption.findMany({
      where: { id: { in: numericIds } },
      include: { careerSubOption: true },
    });

    return viaJunction
      .map((j) => j.careerSubOption)
      .filter(Boolean) as unknown as CareerSubOption[];
  } catch (error) {
    console.error("[getCareerSubOptionsByIds] Error:", error);
    return [];
  }
}

/**
 * Fetch the "CV Book" sub-option.
 *
 * Matching is case-insensitive and whitespace-tolerant, which the Directus
 * version only achieved by falling back to loading every sub-option and
 * comparing in JavaScript when the exact-match filter missed.
 */
export async function getCVBookSubOption(): Promise<CareerSubOption | null> {
  try {
    const row = await prisma.careerSubOption.findFirst({
      where: { name: { equals: "CV Book", mode: "insensitive" } },
    });
    if (row) return row as unknown as CareerSubOption;

    // Tolerate stray whitespace in the stored name.
    const all = await prisma.careerSubOption.findMany({ take: 100 });
    return (all.find(
      (o) => o.name?.trim().toLowerCase() === "cv book"
    ) ?? null) as unknown as CareerSubOption | null;
  } catch (error) {
    console.error("[getCVBookSubOption] Error:", error);
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Career sub-option writes
 * ------------------------------------------------------------------ */

function toSubOptionWrite(payload: Record<string, any>): Record<string, unknown> {
  const { id: _id, active: _active, ...rest } = payload;
  return {
    ...rest,
    ...(payload.price !== undefined
      ? { price: payload.price == null ? null : String(payload.price) }
      : {}),
    date_updated: new Date(),
  };
}

export async function createCareerSubOption(payload: Record<string, any>): Promise<CareerSubOption> {
  const row = await prisma.careerSubOption.create({ data: toSubOptionWrite(payload) });
  return row as unknown as CareerSubOption;
}

export async function updateCareerSubOption(
  id: number,
  payload: Record<string, any>
): Promise<CareerSubOption> {
  const row = await prisma.careerSubOption.update({
    where: { id },
    data: toSubOptionWrite(payload),
  });
  return row as unknown as CareerSubOption;
}

/** Removes an unused sub-option. Sold sub-options are retained for history. */
export async function deleteCareerSubOption(id: number): Promise<void> {
  const sales = await prisma.companyCareerSubOption.count({
    where: { career_sub_option_id: id },
  });
  if (sales > 0) {
    throw new Error("This sub-option has sales history and cannot be deleted");
  }
  await prisma.$transaction([
    prisma.careerEventOptionSubOption.deleteMany({ where: { career_sub_option_id: id } }),
    prisma.careerSubOption.delete({ where: { id } }),
  ]);
}

/* ------------------------------------------------------------------ *
 * Career event option writes (+ event & sub-option junctions)
 * ------------------------------------------------------------------ */

function toOptionWrite(payload: Record<string, any>): Record<string, unknown> {
  const {
    id: _id,
    eventIds: _eventIds,
    subOptionIds: _subOptionIds,
    events: _events,
    sub_options: _subOptions,
    ...rest
  } = payload;
  return {
    ...rest,
    ...(payload.academic_year_id !== undefined
      ? { academic_year_id: payload.academic_year_id ? Number(payload.academic_year_id) : null }
      : {}),
    ...(payload.name !== undefined && payload.series_key === undefined
      ? { series_key: slugifyEventName(String(payload.name)) }
      : {}),
    ...(payload.price !== undefined
      ? { price: payload.price == null || payload.price === "" ? null : Number(payload.price) }
      : {}),
    date_updated: new Date(),
  };
}

/** Replaces an option's linked events with exactly `eventIds`. */
export async function setOptionEvents(optionId: string, eventIds: string[]): Promise<void> {
  const ids = [...new Set(eventIds.filter(Boolean))];
  const option = await prisma.careerEventOption.findUnique({
    where: { id: optionId },
    select: { academic_year_id: true },
  });
  if (!option) throw new Error("Option not found");
  if (ids.length) {
    const events = await prisma.careerEvent.findMany({
      where: { id: { in: ids } },
      select: { id: true, academic_year_id: true },
    });
    if (
      events.length !== ids.length
      || events.some((event) => event.academic_year_id !== option.academic_year_id)
    ) {
      throw new Error("Options can only link to events from the same academic year");
    }
  }
  await prisma.$transaction([
    prisma.careerEventOptionEvent.deleteMany({ where: { career_event_option_id: optionId } }),
    ...(ids.length
      ? [
          prisma.careerEventOptionEvent.createMany({
            data: ids.map((career_event_id) => ({
              career_event_option_id: optionId,
              career_event_id,
            })),
          }),
        ]
      : []),
  ]);
}

/** Replaces an option's linked sub-options with exactly `subOptionIds`. */
export async function setOptionSubOptions(optionId: string, subOptionIds: number[]): Promise<void> {
  const ids = [...new Set(subOptionIds.map(Number).filter(Number.isFinite))];
  await prisma.$transaction([
    prisma.careerEventOptionSubOption.deleteMany({ where: { career_event_option_id: optionId } }),
    ...(ids.length
      ? [
          prisma.careerEventOptionSubOption.createMany({
            data: ids.map((career_sub_option_id) => ({
              career_event_option_id: optionId,
              career_sub_option_id,
            })),
          }),
        ]
      : []),
  ]);
}

export async function createCareerEventOption(payload: Record<string, any>): Promise<CareerEventOption> {
  const academicYearId = await assertAcademicYearWritable(
    await resolveAcademicYearId(payload.academic_year_id)
  );
  const row = await prisma.careerEventOption.create({
    data: { ...toOptionWrite(payload), academic_year_id: academicYearId, date_created: new Date() },
  });
  if (Array.isArray(payload.eventIds)) await setOptionEvents(row.id, payload.eventIds.map(String));
  if (Array.isArray(payload.subOptionIds)) await setOptionSubOptions(row.id, payload.subOptionIds.map(Number));
  return getCareerEventOptionById(row.id) as Promise<CareerEventOption>;
}

export async function updateCareerEventOption(
  id: string,
  payload: Record<string, any>
): Promise<CareerEventOption> {
  const existing = await prisma.careerEventOption.findUnique({
    where: { id },
    select: { academic_year_id: true },
  });
  if (!existing) throw new Error("Option not found");
  await assertAcademicYearWritable(existing.academic_year_id ?? await resolveAcademicYearId());
  if (payload.academic_year_id !== undefined) {
    const targetYearId = await assertAcademicYearWritable(payload.academic_year_id);
    if (existing.academic_year_id != null && targetYearId !== existing.academic_year_id) {
      throw new Error("An option cannot be moved to another academic year; copy it instead");
    }
  }
  await prisma.careerEventOption.update({ where: { id }, data: toOptionWrite(payload) });
  if (Array.isArray(payload.eventIds)) await setOptionEvents(id, payload.eventIds.map(String));
  if (Array.isArray(payload.subOptionIds)) await setOptionSubOptions(id, payload.subOptionIds.map(Number));
  return getCareerEventOptionById(id) as Promise<CareerEventOption>;
}

/** Removes an unused option. Sold options are retained for history. */
export async function deleteCareerEventOption(id: string): Promise<void> {
  const option = await prisma.careerEventOption.findUnique({
    where: { id },
    select: { academic_year_id: true, _count: { select: { companyCareerEventOptions: true } } },
  });
  if (!option) return;
  if (option.academic_year_id != null) await assertAcademicYearWritable(option.academic_year_id);
  if (option._count.companyCareerEventOptions > 0) {
    throw new Error("This option has sales history and cannot be deleted");
  }
  await prisma.$transaction([
    prisma.careerEventOptionEvent.deleteMany({ where: { career_event_option_id: id } }),
    prisma.careerEventOptionSubOption.deleteMany({ where: { career_event_option_id: id } }),
    prisma.careerEventOption.delete({ where: { id } }),
  ]);
}

async function getCareerEventOptionById(id: string): Promise<CareerEventOption | null> {
  const row = await prisma.careerEventOption.findUnique({
    where: { id },
    include: {
      academicYear: true,
      careerEventOptionEvents: { include: { careerEvent: { include: { academicYear: true } } } },
      careerEventOptionSubOptions: { include: { careerSubOption: true } },
    },
  });
  return shapeCareerEventOption(row) as CareerEventOption | null;
}
