// lib/repos/floorplan.ts
"use server";

import { prisma } from "@/lib/prisma";
import { COMPANY_INCLUDE, shapeBooth, shapeCompany, shapeEventPage } from "@/lib/repos/_shape";
import type { Floorplan, Booth, CareerEventPage, Company, HeaderButtonType } from "@/lib/schema";

/** Ids cross this API as strings; floorplan/booth/page columns are integers. */
const num = (v: string | number) => Number(v);

export async function createFloorplan(payload: {
  name: string;
  year: string;
  svg_file: string;
  background_image?: string;
}): Promise<Floorplan | null> {
  try {
    return (await prisma.floorplan.create({ data: payload })) as unknown as Floorplan;
  } catch (error) {
    console.error("Failed to create floorplan:", error);
    return null;
  }
}

export async function linkFloorplanToEventPage(
  floorplanId: string,
  eventPageId: string
): Promise<boolean> {
  try {
    await prisma.careerEventPage.update({
      where: { id: num(eventPageId) },
      data: { floorplan_id: num(floorplanId) },
    });
    return true;
  } catch (error) {
    console.error("Failed to link floorplan to event page:", error);
    return false;
  }
}

export async function getOrCreateEventPage(eventId: string): Promise<CareerEventPage | null> {
  try {
    const existing = await prisma.careerEventPage.findFirst({
      where: { event_id: eventId },
      include: { event: true },
    });
    if (existing) return shapeEventPage(existing) as CareerEventPage;

    const created = await prisma.careerEventPage.create({
      data: { event_id: eventId, description_EN: "" },
      include: { event: true },
    });
    return shapeEventPage(created) as CareerEventPage;
  } catch (error) {
    console.error("Failed to get or create event page:", error);
    return null;
  }
}

export async function deleteBoothsForFloorplan(floorplanId: string): Promise<boolean> {
  try {
    const id = num(floorplanId);
    // Orders and zone memberships reference booths and have no cascade, so they
    // are cleared first or the delete fails on the foreign key.
    await prisma.$transaction(async (tx) => {
      const booths = await tx.booth.findMany({
        where: { floorplan_id: id },
        select: { id: true },
      });
      const boothIds = booths.map((b) => b.id);
      if (boothIds.length) {
        await tx.zoneBooth.deleteMany({ where: { booth_id: { in: boothIds } } });
        await tx.order.updateMany({
          where: { booth_id: { in: boothIds } },
          data: { booth_id: null },
        });
      }
      await tx.booth.deleteMany({ where: { floorplan_id: id } });
    });
    return true;
  } catch (error) {
    console.error("Failed to delete booths for floorplan:", error);
    return false;
  }
}

/**
 * Create or update booths for a floorplan.
 *
 * The Directus version issued three requests per booth (select, then insert or
 * update) inside a loop, so importing a ~200 booth floorplan meant ~600 round
 * trips. This does one query for the existing set and batches the writes.
 *
 * `coords` is passed through as an object: the column is json and every one of
 * the 2888 existing rows holds an object, so the previous JSON.stringify was
 * relying on Directus to parse it back.
 */
export async function createBooths(booths: Array<{
  booth_number: number;
  coords: unknown; // JSON object
  Floorplan: string; // Floorplan ID
}>, deleteExisting: boolean = true): Promise<Booth[] | null> {
  try {
    if (booths.length === 0) return [];

    const floorplanId = num(booths[0].Floorplan);

    const coordsOf = (c: unknown) =>
      typeof c === "string" ? (JSON.parse(c) as object) : (c as object);

    if (deleteExisting) {
      await deleteBoothsForFloorplan(booths[0].Floorplan);
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.booth.findMany({
        where: {
          floorplan_id: floorplanId,
          booth_number: { in: booths.map((b) => b.booth_number) },
        },
        select: { id: true, booth_number: true },
      });
      const byNumber = new Map(existing.map((e) => [e.booth_number, e.id]));

      const toCreate = booths.filter((b) => !byNumber.has(b.booth_number));
      const toUpdate = booths.filter((b) => byNumber.has(b.booth_number));

      for (const b of toUpdate) {
        await tx.booth.update({
          where: { id: byNumber.get(b.booth_number)! },
          data: { coords: coordsOf(b.coords) as any, floorplan_id: floorplanId },
        });
      }

      if (toCreate.length) {
        await tx.booth.createMany({
          data: toCreate.map((b) => ({
            booth_number: b.booth_number,
            coords: coordsOf(b.coords) as any,
            floorplan_id: floorplanId,
          })),
        });
      }

      return tx.booth.findMany({
        where: {
          floorplan_id: floorplanId,
          booth_number: { in: booths.map((b) => b.booth_number) },
        },
        orderBy: { booth_number: "asc" },
      });
    });

    return result.map(shapeBooth) as Booth[];
  } catch (error) {
    console.error("Failed to create booths:", error);
    return null;
  }
}

/**
 * Unlike listEventPages in repos/event.ts, this one returns `companies` already
 * flattened to Company[] rather than junction-wrapped -- matching what the
 * floorplan admin screens expect.
 */
export async function getEventPageWithFloorplan(eventId: string): Promise<CareerEventPage | null> {
  try {
    const page = await prisma.careerEventPage.findFirst({
      where: { event_id: eventId },
      include: {
        event: true,
        floorplan: true,
        careerEventPageCompanies: { include: { company: { include: COMPANY_INCLUDE } } },
      },
    });
    if (!page) return null;

    const shaped = shapeEventPage(page) as Record<string, any>;
    shaped.companies = (page.careerEventPageCompanies ?? [])
      .map((j) => j.company)
      .filter(Boolean)
      .map(shapeCompany);

    return shaped as CareerEventPage;
  } catch (error) {
    console.error("Failed to get event page with floorplan:", error);
    return null;
  }
}

export async function updateBoothCompany(boothId: string, companyId: string | null): Promise<Booth | null> {
  try {
    const updated = await prisma.booth.update({
      where: { id: num(boothId) },
      data: { company_id: companyId },
      include: { company: true },
    });
    return shapeBooth(updated) as Booth;
  } catch (error) {
    console.error("Failed to update booth company:", error);
    return null;
  }
}

export async function deleteFloorplan(floorplanId: string): Promise<boolean> {
  try {
    const id = num(floorplanId);

    // Event pages must be unlinked before the floorplan row goes: the previous
    // implementation deleted the floorplan first and unlinked afterwards, which
    // only survived because Directus was not enforcing the constraint.
    await prisma.careerEventPage.updateMany({
      where: { floorplan_id: id },
      data: { floorplan_id: null },
    });

    await deleteBoothsForFloorplan(floorplanId);
    await prisma.floorplan.delete({ where: { id } });

    return true;
  } catch (error) {
    console.error("Failed to delete floorplan:", error);
    return false;
  }
}

export async function getCompaniesForEvent(eventId: string): Promise<Company[]> {
  try {
    const links = await prisma.careerEventPageCompany.findMany({
      where: { careerEventPage: { event_id: eventId } },
      include: { company: { include: COMPANY_INCLUDE } },
    });

    return links
      .map((l) => l.company)
      .filter(Boolean)
      .map(shapeCompany) as Company[];
  } catch (error) {
    console.error("Failed to get companies for event:", error);
    return [];
  }
}

export async function getBoothsForFloorplan(floorplanId: string): Promise<Booth[]> {
  try {
    const booths = await prisma.booth.findMany({
      where: { floorplan_id: num(floorplanId) },
      include: { company: { include: COMPANY_INCLUDE }, floorplan: true },
      orderBy: { booth_number: "asc" },
    });
    return booths.map(shapeBooth) as Booth[];
  } catch (error) {
    console.error("Failed to get booths for floorplan:", error);
    return [];
  }
}

export async function updateEventPageHeaderButtons(
  eventId: string,
  headerButtons: HeaderButtonType[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const eventPage = await getOrCreateEventPage(eventId);
    if (!eventPage) return { success: false, error: "Event page not found" };

    await prisma.careerEventPage.update({
      where: { id: num(eventPage.id as unknown as string) },
      data: { header_buttons: headerButtons },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update header buttons:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update",
    };
  }
}

export async function updateFloorplanCategoryFormFields(
  eventId: string,
  categoryFormFields: Array<{ formId: string; formVersionId: string; fieldName: string }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const eventPage = await getEventPageWithFloorplan(eventId);
    if (!eventPage?.floorplan?.id) {
      return { success: false, error: "Event page or floorplan not found" };
    }

    await prisma.floorplan.update({
      where: { id: num(eventPage.floorplan.id as unknown as string) },
      data: { floorplan_category_form_fields: categoryFormFields },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update floorplan category form fields:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update",
    };
  }
}

export async function updateFloorplanCompanyNameFormFields(
  eventId: string,
  companyNameFormFields: Array<{ formId: string; formVersionId: string; fieldName: string }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const eventPage = await getEventPageWithFloorplan(eventId);
    if (!eventPage?.floorplan?.id) {
      return { success: false, error: "Event page or floorplan not found" };
    }

    await prisma.floorplan.update({
      where: { id: num(eventPage.floorplan.id as unknown as string) },
      data: { floorplan_company_name_form_field: companyNameFormFields },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update floorplan company name form fields:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update",
    };
  }
}
