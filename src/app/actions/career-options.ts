"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth-server";
import {
  listCareerSubOptions,
  createCareerSubOption,
  updateCareerSubOption,
  deleteCareerSubOption,
  listCareerEventOptions,
  createCareerEventOption,
  updateCareerEventOption,
  deleteCareerEventOption,
} from "@/lib/repos/option";
import type { ActionResult } from "@/components/admin/types";
import type { CareerSubOption, CareerEventOption } from "@/lib/schema";

/* ---------------------------- Sub-options ---------------------------- */

export async function listSubOptionsAction(): Promise<CareerSubOption[]> {
  await requireAdminUser();
  return listCareerSubOptions({ limit: 500 });
}

export async function createSubOptionAction(data: Record<string, unknown>): Promise<ActionResult<CareerSubOption>> {
  try {
    await requireAdminUser();
    const subOption = await createCareerSubOption(data);
    revalidatePath("/admin/career-options");
    return { success: true, data: subOption };
  } catch (error) {
    console.error("[createSubOptionAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create sub-option" };
  }
}

export async function updateSubOptionAction(id: string, data: Record<string, unknown>): Promise<ActionResult<CareerSubOption>> {
  try {
    await requireAdminUser();
    const subOption = await updateCareerSubOption(Number(id), data);
    revalidatePath("/admin/career-options");
    return { success: true, data: subOption };
  } catch (error) {
    console.error("[updateSubOptionAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update sub-option" };
  }
}

export async function deleteSubOptionAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminUser();
    await deleteCareerSubOption(Number(id));
    revalidatePath("/admin/career-options");
    return { success: true };
  } catch (error) {
    console.error("[deleteSubOptionAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete sub-option" };
  }
}

/* -------------------------- Event options -------------------------- */

export async function listEventOptionsAction(): Promise<CareerEventOption[]> {
  await requireAdminUser();
  return (await listCareerEventOptions({ limit: 1000 })) ?? [];
}

export async function createEventOptionAction(data: Record<string, unknown>): Promise<ActionResult<CareerEventOption>> {
  try {
    await requireAdminUser();
    const option = await createCareerEventOption(data);
    revalidatePath("/admin/career-options");
    return { success: true, data: option };
  } catch (error) {
    console.error("[createEventOptionAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create option" };
  }
}

export async function updateEventOptionAction(id: string, data: Record<string, unknown>): Promise<ActionResult<CareerEventOption>> {
  try {
    await requireAdminUser();
    const option = await updateCareerEventOption(id, data);
    revalidatePath("/admin/career-options");
    return { success: true, data: option };
  } catch (error) {
    console.error("[updateEventOptionAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update option" };
  }
}

export async function deleteEventOptionAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminUser();
    await deleteCareerEventOption(id);
    revalidatePath("/admin/career-options");
    return { success: true };
  } catch (error) {
    console.error("[deleteEventOptionAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete option" };
  }
}
