// lib/repos/option.ts
"use server"

import { prisma } from "@/lib/prisma";
import { shapeCareerEventOption } from "@/lib/repos/_shape";
import type { CareerEventOption, CareerSubOption } from "@/lib/schema";

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
}) {
  try {
    const { limit = 1000 } = opts ?? {};

    const rows = await prisma.careerEventOption.findMany({
      include: {
        careerEventOptionEvents: { include: { careerEvent: true } },
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
