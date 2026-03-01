// app/actions/cv-book.ts
"use server";

import {
  listCVBooks,
  getCVBookById,
  createCVBook,
  updateCVBook,
  deleteCVBook,
  listAcademicYears,
  getAcademicYearById,
  getActiveCVBooks,
  getCVBookByYear,
  getCVBookStudentData,
} from "@/lib/repos/cv-book";
import {
  listFavourites,
  addFavourite,
  removeFavourite,
} from "@/lib/repos/cv-book-favourites";
import { listForms } from "@/lib/repos/forms";
import { getUserFromCookies } from "@/lib/auth-server";
import { listFormVersions } from "@/lib/repos/forms";
import type { CVBook, AcademicYear, Form, FormField } from "@/lib/schema";

export async function fetchCVBooksAction(): Promise<CVBook[]> {
  try {
    return await listCVBooks();
  } catch (error) {
    console.error("[fetchCVBooksAction] Error:", error);
    return [];
  }
}

export async function fetchCVBookByIdAction(id: string): Promise<CVBook | null> {
  try {
    return await getCVBookById(id);
  } catch (error) {
    console.error("[fetchCVBookByIdAction] Error:", error);
    return null;
  }
}

export async function createCVBookAction(data: {
  year: string;
  form: string;
  student_first_name_field: string;
  student_last_name_field: string;
  student_email_field: string;
  student_study_field: string;
  student_cv_field: string;
  student_linkedin_field?: string;
  student_first_name_field_backup?: string;
  student_last_name_field_backup?: string;
  student_email_field_backup?: string;
  student_study_field_backup?: string;
  student_cv_field_backup?: string;
  student_linkedin_field_backup?: string;
}): Promise<{ success: boolean; error?: string; cvBook?: CVBook }> {
  try {
    const cvBook = await createCVBook(data);
    return { success: true, cvBook };
  } catch (error) {
    console.error("[createCVBookAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create CV Book",
    };
  }
}

export async function updateCVBookAction(
  id: string,
  data: Partial<CVBook>
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateCVBook(id, data);
    return { success: true };
  } catch (error) {
    console.error("[updateCVBookAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update CV Book",
    };
  }
}

export async function deleteCVBookAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteCVBook(id);
    return { success: true };
  } catch (error) {
    console.error("[deleteCVBookAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete CV Book",
    };
  }
}

export async function fetchActiveCVBooksAction(): Promise<CVBook[]> {
  try {
    return await getActiveCVBooks();
  } catch (error) {
    console.error("[fetchActiveCVBooksAction] Error:", error);
    return [];
  }
}

export async function toggleCVBookActiveAction(id: string, active: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    await updateCVBook(id, { active });
    return { success: true };
  } catch (error) {
    console.error("[toggleCVBookActiveAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle CV Book active status",
    };
  }
}

export async function fetchCVBookByYearAction(yearId: string): Promise<CVBook | null> {
  try {
    return await getCVBookByYear(yearId);
  } catch (error) {
    console.error("[fetchCVBookByYearAction] Error:", error);
    return null;
  }
}

export async function fetchCVBookStudentDataAction(cvBook: CVBook): Promise<import("@/lib/repos/cv-book").StudentCVGroup[]> {
  try {
    return await getCVBookStudentData(cvBook);
  } catch (error) {
    console.error("[fetchCVBookStudentDataAction] Error:", error);
    return [];
  }
}

// ===================== CV BOOK FAVOURITES =====================

export async function fetchCVBookFavouritesAction(
  cvBookId: string,
  clientCompanyId?: string
): Promise<string[]> {
  try {
    const user = await getUserFromCookies();
    if (!user?.id) return [];

    let companyId: string | undefined =
      (user.company && (typeof user.company === "string" ? user.company : user.company.id)) ?? undefined;
    if (!companyId && clientCompanyId) {
      companyId = clientCompanyId;
    }
    if (!companyId) return [];

    return await listFavourites(companyId, cvBookId);
  } catch (error) {
    console.error("[fetchCVBookFavouritesAction] Error:", error);
    return [];
  }
}

export async function toggleCVBookFavouriteAction(
  formResponseId: string,
  cvBookId: string,
  isFavourite: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUserFromCookies();
    if (!user?.company?.id) {
      return { success: false, error: "Not authenticated or no company" };
    }

    const companyId =
      typeof user.company === "string" ? user.company : user.company.id;

    if (isFavourite) {
      return await removeFavourite(companyId, formResponseId, cvBookId);
    } else {
      return await addFavourite(companyId, formResponseId, cvBookId);
    }
  } catch (error) {
    console.error("[toggleCVBookFavouriteAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle favourite",
    };
  }
}

export async function fetchAcademicYearsAction(): Promise<AcademicYear[]> {
  try {
    return await listAcademicYears();
  } catch (error) {
    console.error("[fetchAcademicYearsAction] Error:", error);
    return [];
  }
}

export async function fetchAcademicYearByIdAction(id: string): Promise<AcademicYear | null> {
  try {
    return await getAcademicYearById(id);
  } catch (error) {
    console.error("[fetchAcademicYearByIdAction] Error:", error);
    return null;
  }
}

export async function fetchFormsAction(): Promise<Form[]> {
  try {
    return await listForms();
  } catch (error) {
    console.error("[fetchFormsAction] Error:", error);
    return [];
  }
}

/**
 * Get all unique form fields across all versions of a form.
 * This ensures field mappings work across all form versions.
 */
export async function getFormFieldsAcrossAllVersions(formId: string): Promise<FormField[]> {
  if (!formId) {
    return [];
  }
  
  try {
    const versions = await listFormVersions(formId);
    
    if (!versions || versions.length === 0) {
      return [];
    }
    
    // Collect all fields from all versions
    const allFields = new Map<string, FormField>();
    
    for (const version of versions) {
      if (version.schema?.fields && Array.isArray(version.schema.fields)) {
        for (const field of version.schema.fields) {
          // Use field name as key to avoid duplicates
          // If a field with the same name exists, keep the one with more complete data
          if (!allFields.has(field.name) || 
              (allFields.get(field.name)?.label && !field.label)) {
            allFields.set(field.name, field);
          }
        }
      }
    }
    
    return Array.from(allFields.values());
  } catch (error) {
    // Log error but don't throw - return empty array to prevent UI breakage
    console.error("[getFormFieldsAcrossAllVersions] Error fetching form fields for formId:", formId, error);
    // Check if it's a connection error
    if (error instanceof Error && (error.message.includes('ECONNRESET') || error.message.includes('fetch failed'))) {
      console.warn("[getFormFieldsAcrossAllVersions] Connection error - Directus may be slow or unavailable");
    }
    return [];
  }
}

