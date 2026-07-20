"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth-server";
import {
  listFaculties,
  createFaculty,
  updateFaculty,
  deleteFaculty,
} from "@/lib/repos/features";
import type { ActionResult } from "@/components/admin/types";
import type { Faculty } from "@/lib/schema";

export async function listFacultiesAction(): Promise<Faculty[]> {
  await requireAdminUser();
  return (await listFaculties({ limit: 200, sort: "name" })) ?? [];
}

export async function createFacultyAction(data: Record<string, unknown>): Promise<ActionResult<Faculty>> {
  try {
    await requireAdminUser();
    const faculty = await createFaculty(data);
    revalidatePath("/admin/faculties");
    return { success: true, data: faculty };
  } catch (error) {
    console.error("[createFacultyAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create faculty" };
  }
}

export async function updateFacultyAction(id: string, data: Record<string, unknown>): Promise<ActionResult<Faculty>> {
  try {
    await requireAdminUser();
    const faculty = await updateFaculty(Number(id), data);
    revalidatePath("/admin/faculties");
    return { success: true, data: faculty };
  } catch (error) {
    console.error("[updateFacultyAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update faculty" };
  }
}

export async function deleteFacultyAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminUser();
    await deleteFaculty(Number(id));
    revalidatePath("/admin/faculties");
    return { success: true };
  } catch (error) {
    console.error("[deleteFacultyAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete faculty" };
  }
}
