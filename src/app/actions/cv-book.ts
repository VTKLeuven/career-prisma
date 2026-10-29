// app/actions/cv-book.ts
"use server";

import {
  listCVBooks,
  getCVBookById,
  createCVBook,
  updateCVBook,
  deleteCVBook,
  listAcademicYears,
  getActiveCVBooks,
  getCVBookByYear,
  getCVBookByYearForScreening,
  getCVBookStudentData,
  listCVBooksForCompany,
  listCVBookYearIdsForCompany,
  canCompanyOpenCVBook,
  masterDegreeStudyOptions,
} from "@/lib/repos/cv-book";
import {
  approveCV,
  rejectCV,
  updateStudyOverride,
} from "@/lib/repos/cv-book-screening";
import {
  addFavourite,
  removeFavourite,
} from "@/lib/repos/cv-book-favourites";
import { listForms } from "@/lib/repos/forms";
import { getUserFromCookies, requireAdminUser } from "@/lib/auth-server";
import { listFormVersions } from "@/lib/repos/forms";
import type { CVBook, AcademicYear, Form, FormField } from "@/lib/schema";

/** Admins and company users: CV book configuration is not public. */
async function requireSignedInUser() {
  const user = await getUserFromCookies();
  if (!user) throw new Error("Unauthorized");
  return user;
}

/** The signed-in user's company id, if they are a company user. */
function companyIdOf(user: Awaited<ReturnType<typeof getUserFromCookies>>): string | null {
  if (!user?.company) return null;
  return typeof user.company === "string" ? user.company : user.company.id;
}

export async function fetchCVBooksAction(): Promise<CVBook[]> {
  try {
    await requireAdminUser();
    return await listCVBooks();
  } catch (error) {
    console.error("[fetchCVBooksAction] Error:", error);
    return [];
  }
}

export async function fetchCVBookByIdAction(id: string): Promise<CVBook | null> {
  try {
    const user = await requireSignedInUser();
    if (!user.admin) {
      // A company only learns about books it may open (listCVBooksForCompany).
      const companyId = companyIdOf(user);
      if (!companyId || !(await canCompanyOpenCVBook(companyId, id))) return null;
    }
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
    await requireAdminUser();
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
    await requireAdminUser();
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
    await requireAdminUser();
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

/** Published books: all of them for an admin, the years it bought for a company. */
export async function fetchActiveCVBooksAction(): Promise<CVBook[]> {
  try {
    const user = await requireSignedInUser();
    if (user.admin) return await getActiveCVBooks();
    const companyId = companyIdOf(user);
    return companyId ? await listCVBooksForCompany(companyId) : [];
  } catch (error) {
    console.error("[fetchActiveCVBooksAction] Error:", error);
    return [];
  }
}

/**
 * Whether the company bought the CV book for any year -- what decides between
 * the CV book page and the request-access page. A purchase for a year whose
 * book is not published yet still counts: the page then says there is
 * nothing to show yet, rather than offering to sell it again.
 */
export async function fetchCVBookAccessAction(): Promise<boolean> {
  try {
    const user = await requireSignedInUser();
    if (user.admin) return true;
    const companyId = companyIdOf(user);
    return companyId ? (await listCVBookYearIdsForCompany(companyId)).length > 0 : false;
  } catch (error) {
    console.error("[fetchCVBookAccessAction] Error:", error);
    return false;
  }
}

/** Publish or unpublish: whether companies that bought the year can see the book. */
export async function toggleCVBookActiveAction(id: string, active: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminUser();
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
    const user = await requireSignedInUser();
    if (!user.admin) {
      const companyId = companyIdOf(user);
      if (!companyId) return null;
      const books = await listCVBooksForCompany(companyId);
      return books.find((b) => String(typeof b.year === "object" ? b.year.id : b.year) === String(yearId)) ?? null;
    }
    return await getCVBookByYear(yearId);
  } catch (error) {
    console.error("[fetchCVBookByYearAction] Error:", error);
    return null;
  }
}

export async function fetchCVBookByYearForScreeningAction(yearId: string): Promise<CVBook | null> {
  try {
    await requireAdminUser();
    return await getCVBookByYearForScreening(yearId);
  } catch (error) {
    console.error("[fetchCVBookByYearForScreeningAction] Error:", error);
    return null;
  }
}

export async function fetchCVBookStudentDataAction(cvBook: CVBook): Promise<import("@/lib/repos/cv-book").StudentCVGroup[]> {
  try {
    const user = await getUserFromCookies();
    if (!user) return [];
    if (!user.admin) {
      // Published, and for a year the company bought.
      const companyId = companyIdOf(user);
      if (!companyId || !(await canCompanyOpenCVBook(companyId, cvBook.id))) return [];
    }
    const current = await getCVBookById(cvBook.id);
    if (!current) return [];
    return await getCVBookStudentData(current);
  } catch (error) {
    console.error("[fetchCVBookStudentDataAction] Error:", error);
    return [];
  }
}

export async function fetchCVBookStudentDataForScreeningAction(cvBook: CVBook): Promise<import("@/lib/repos/cv-book").StudentCVGroup[]> {
  try {
    await requireAdminUser();
    return await getCVBookStudentData(cvBook, { forScreening: true });
  } catch (error) {
    console.error("[fetchCVBookStudentDataForScreeningAction] Error:", error);
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
    const companyId = companyIdOf(user);
    if (!companyId) {
      return { success: false, error: "Not authenticated or no company" };
    }
    if (!(await canCompanyOpenCVBook(companyId, cvBookId))) {
      return { success: false, error: "No access to this CV book" };
    }

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

export async function approveCVAction(
  cvBookId: string,
  formResponseId: string,
  studyOverride?: string | null
): Promise<{ success: boolean; error?: string }> {
  await requireAdminUser();
  return approveCV(cvBookId, formResponseId, studyOverride);
}

export async function rejectCVAction(cvBookId: string, formResponseId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdminUser();
  return rejectCV(cvBookId, formResponseId);
}

export async function updateStudyOverrideAction(
  cvBookId: string,
  formResponseId: string,
  studyOverride: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdminUser();
  return updateStudyOverride(cvBookId, formResponseId, studyOverride);
}

/** Get study options from the form's study field (for screening dropdown) */
export async function fetchStudyOptionsForCVBookAction(cvBook: CVBook): Promise<string[]> {
  try {
    await requireAdminUser();
    // A master-degrees field keeps its options in /admin/masters, not on the field.
    const masterOptions = await masterDegreeStudyOptions(cvBook);
    if (masterOptions) return masterOptions;
    const formId = typeof cvBook.form === "string" ? cvBook.form : cvBook.form.id;
    const formFields = await getFormFieldsAcrossAllVersions(formId);
    const studyFieldName = cvBook.student_study_field;
    const studyField = formFields.find((f) => f.name === studyFieldName);
    const options = studyField?.options;
    if (Array.isArray(options) && options.length > 0) {
      return options;
    }
    // Fallback: try backup field
    const backupName = cvBook.student_study_field_backup;
    if (backupName) {
      const backupField = formFields.find((f) => f.name === backupName);
      if (Array.isArray(backupField?.options) && backupField.options.length > 0) {
        return backupField.options;
      }
    }
    return [];
  } catch (error) {
    console.error("[fetchStudyOptionsForCVBookAction] Error:", error);
    return [];
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

export async function fetchFormsAction(): Promise<Form[]> {
  try {
    await requireAdminUser();
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
  await requireAdminUser();
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
      console.warn("[getFormFieldsAcrossAllVersions] Database connection may be unavailable");
    }
    return [];
  }
}
