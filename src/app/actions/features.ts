// app/actions/features.ts
"use server";
import { listMasters, listFaculties } from "@/lib/repos/features";
import type { CareerEventPage, Booth } from "@/lib/schema";
import { getEventPageWithFloorplan, getBoothsForFloorplan } from "@/lib/repos/floorplan";
import { loadFloorplanData } from "@/lib/floorplan-data";
import { requireAdminUser } from "@/lib/auth-server";

/**
 * The floorplan editor's data for one event. Loads the event page itself
 * rather than taking one from the client: `loadFloorplanData()` reads the file
 * the page names, so a client-supplied page could read any upload.
 */
export async function fetchFloorplanForEventAction(eventId: string) {
  await requireAdminUser();
  const page = await getEventPageWithFloorplan(eventId);
  if (!page) return null;
  return loadFloorplanData(page);
}

/** The event page with its floorplan and flattened companies (admin screens). */
export async function fetchEventPageWithFloorplanAction(eventId: string): Promise<CareerEventPage | null> {
  await requireAdminUser();
  return getEventPageWithFloorplan(eventId);
}

export async function fetchBoothsForFloorplanAction(floorplanId: string): Promise<Booth[]> {
  await requireAdminUser();
  return getBoothsForFloorplan(floorplanId);
}

export async function fetchMastersAction() {
    const masters = await listMasters({ limit: 300, sort: "name" }) ?? [];
    return masters
}

export async function fetchFacultiesAction() {
  const faculties = await listFaculties({ limit: 100, sort: "name" }) ?? [];
  return faculties;
}

export async function updateFloorplanCategoryFormFieldsAction(
  eventId: string,
  categoryFormFields: Array<{ formId: string; formVersionId: string; fieldName: string }>
) {
  try {
    await requireAdminUser();
    const { updateFloorplanCategoryFormFields } = await import("@/lib/repos/floorplan");
    return await updateFloorplanCategoryFormFields(eventId, categoryFormFields);
  } catch (error) {
    console.error("[updateFloorplanCategoryFormFieldsAction] Error:", error);
    return { success: false, error: String(error) };
  }
}

export async function updateFloorplanCompanyNameFormFieldsAction(
  eventId: string,
  companyNameFormFields: Array<{ formId: string; formVersionId: string; fieldName: string }>
) {
  try {
    await requireAdminUser();
    const { updateFloorplanCompanyNameFormFields } = await import("@/lib/repos/floorplan");
    return await updateFloorplanCompanyNameFormFields(eventId, companyNameFormFields);
  } catch (error) {
    console.error("[updateFloorplanCompanyNameFormFieldsAction] Error:", error);
    return { success: false, error: String(error) };
  }
}
