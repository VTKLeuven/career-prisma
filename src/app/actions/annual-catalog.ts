"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth-server";
import { copyAnnualCatalog } from "@/lib/repos/annual-catalog";
import { createAcademicYear } from "@/lib/repos/academic-year";
import {
  createOptionSale,
  createSubOptionSale,
  deleteOptionSale,
  deleteSubOptionSale,
} from "@/lib/repos/option-sales";

export async function copyAnnualCatalogAction(sourceYearId: string, targetYearId: string) {
  try {
    await requireAdminUser();
    const result = await copyAnnualCatalog(Number(sourceYearId), Number(targetYearId));
    revalidatePath("/admin/career-options");
    revalidatePath("/admin/event-pages");
    revalidatePath("/event");
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to copy catalog" };
  }
}

export async function createAcademicYearAction(data: {
  name: string;
  startOfYear: string;
  endOfYear: string;
}) {
  try {
    await requireAdminUser();
    const year = await createAcademicYear(data);
    revalidatePath("/admin/career-options");
    revalidatePath("/admin/event-pages");
    revalidatePath("/admin");
    return { success: true, data: year };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create academic year" };
  }
}

export async function createOptionSaleAction(data: {
  companyId: string;
  optionId: string;
  academicYearId: string;
}) {
  try {
    await requireAdminUser();
    const sale = await createOptionSale(data);
    revalidatePath("/admin/career-options");
    revalidatePath("/admin");
    return { success: true, data: sale };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to record sale" };
  }
}

export async function createCatalogSaleAction(data: {
  companyId: string;
  itemId: string;
  kind: "option" | "sub-option";
  academicYearId: string;
}) {
  try {
    await requireAdminUser();
    if (data.kind === "option") {
      await createOptionSale({
        companyId: data.companyId,
        optionId: data.itemId,
        academicYearId: data.academicYearId,
      });
    } else {
      await createSubOptionSale({
        companyId: data.companyId,
        subOptionId: data.itemId,
        academicYearId: data.academicYearId,
      });
    }
    revalidatePath("/admin/career-options");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to record sale" };
  }
}

export async function deleteOptionSaleAction(id: string, kind: "option" | "sub-option" = "option") {
  try {
    await requireAdminUser();
    if (kind === "option") await deleteOptionSale(Number(id));
    else await deleteSubOptionSale(Number(id));
    revalidatePath("/admin/career-options");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to remove sale" };
  }
}
