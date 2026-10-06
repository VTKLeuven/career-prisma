// app/actions/features.ts
"use server";
import { listMasters, listFaculties } from "@/lib/repos/features";
import type { Booth } from "@/lib/schema";
import { getEventPageWithFloorplan, getBoothsForFloorplan } from "@/lib/repos/floorplan";
import { loadFloorplanData } from "@/lib/floorplan-data";
import { requireAdminUser } from "@/lib/auth-server";

/**
 * Everything the floorplan editor opens with -- event page, SVG, booths, the
 * event's companies and its company forms -- loaded in parallel in one round
 * trip. The editor used to make five server actions, which Next runs one at a
 * time.
 */
export async function fetchFloorplanEditorAction(eventId: string) {
  await requireAdminUser();
  const page = await getEventPageWithFloorplan(eventId);
  if (!page?.floorplan) return null;
  const { getCompaniesForEvent } = await import("@/lib/repos/company");
  const { getAllCompanyFormsForEvent } = await import("@/lib/repos/forms");
  const [floorplan, booths, companies, forms] = await Promise.all([
    loadFloorplanData(page),
    page.floorplan.id ? getBoothsForFloorplan(String(page.floorplan.id)) : Promise.resolve([] as Booth[]),
    getCompaniesForEvent(eventId),
    getAllCompanyFormsForEvent(eventId).catch(() => []),
  ]);
  return { page, svg: floorplan?.svg ?? "", booths, companies, forms };
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
