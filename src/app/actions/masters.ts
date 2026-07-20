"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth-server";
import { listMasters, createMaster, updateMaster, deleteMaster } from "@/lib/repos/features";
import type { ActionResult } from "@/components/admin/types";
import type { Master } from "@/lib/schema";

export async function listMastersAction(): Promise<Master[]> {
  await requireAdminUser();
  return (await listMasters({ limit: 500, sort: "name" })) ?? [];
}

export async function createMasterAction(data: Record<string, unknown>): Promise<ActionResult<Master>> {
  try {
    await requireAdminUser();
    const master = await createMaster(data);
    revalidatePath("/admin/masters");
    revalidatePath("/admin/faculties");
    return { success: true, data: master };
  } catch (error) {
    console.error("[createMasterAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create master" };
  }
}

export async function updateMasterAction(id: string, data: Record<string, unknown>): Promise<ActionResult<Master>> {
  try {
    await requireAdminUser();
    const master = await updateMaster(Number(id), data);
    revalidatePath("/admin/masters");
    revalidatePath("/admin/faculties");
    return { success: true, data: master };
  } catch (error) {
    console.error("[updateMasterAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update master" };
  }
}

export async function deleteMasterAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminUser();
    await deleteMaster(Number(id));
    revalidatePath("/admin/masters");
    revalidatePath("/admin/faculties");
    return { success: true };
  } catch (error) {
    console.error("[deleteMasterAction]", error);
    return {
      success: false,
      error:
        "Could not delete this master. It is still linked to companies, faculties, vacancies or schedules — remove those links first.",
    };
  }
}
