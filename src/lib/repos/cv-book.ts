// lib/repos/cv-book.ts
"use server";

import { readItems, readItem, createItem, updateItem, deleteItem } from "@directus/sdk";
import { getAuthedDirectusOrThrow } from "@/lib/directus";
import type { CVBook, AcademicYear, FormResponse } from "@/lib/schema";
import { listFormResponsesForAllVersions } from "./forms";

// ===================== ACADEMIC YEARS =====================

export async function listAcademicYears(opts?: {
  search?: string;
  limit?: number;
  page?: number;
  sort?: string;
}) {
  try {
    const client = await getAuthedDirectusOrThrow();
    const { search, limit = 100, page = 1, sort = "-start_of_year" } = opts ?? {};

    return client.request(
      readItems("Academic_Year", {
        fields: ["*"],
        limit,
        page,
        sort,
        ...(search ? { search } : {}),
      })
    ) as unknown as AcademicYear[];
  } catch (error) {
    console.error("[listAcademicYears] Error listing academic years:", error);
    throw error;
  }
}

export async function getAcademicYearById(id: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
    return client.request(
      readItem("Academic_Year", id, {
        fields: ["*"],
      })
    ) as unknown as AcademicYear;
  } catch (error) {
    console.error("[getAcademicYearById] Error getting academic year:", error);
    throw error;
  }
}

// ===================== CV BOOKS =====================

export async function listCVBooks(opts?: {
  search?: string;
  limit?: number;
  page?: number;
  sort?: string;
  filter?: {
    active?: boolean;
  };
}) {
  try {
    const client = await getAuthedDirectusOrThrow();
    const { search, limit = 100, page = 1, sort = "-date_created", filter } = opts ?? {};

    const filterObj: any = {};
    if (filter?.active !== undefined) {
      filterObj.active = { _eq: filter.active };
    }

    return client.request(
      readItems("CV_Book", {
        fields: [
          "*",
          "year.*",
          "form.id",
          "form.name",
          "form.slug",
        ],
        limit,
        page,
        sort,
        ...(search ? { search } : {}),
        ...(Object.keys(filterObj).length > 0 ? { filter: filterObj } : {}),
      })
    ) as unknown as CVBook[];
  } catch (error) {
    console.error("[listCVBooks] Error listing CV books:", error);
    throw error;
  }
}

export async function getActiveCVBooks() {
  try {
    return await listCVBooks({
      filter: { active: true },
      sort: "-year.start_of_year", // Most recent year first
    });
  } catch (error) {
    console.error("[getActiveCVBooks] Error getting active CV books:", error);
    throw error;
  }
}

export async function getCVBookByYear(yearId: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
    const cvBooks = await client.request(
      readItems("CV_Book", {
        fields: [
          "*",
          "year.*",
          "form.id",
          "form.name",
          "form.slug",
        ],
        filter: {
          year: { _eq: yearId },
          active: { _eq: true },
        },
        limit: 1,
      })
    ) as unknown as CVBook[];
    
    return cvBooks.length > 0 ? cvBooks[0] : null;
  } catch (error) {
    console.error("[getCVBookByYear] Error getting CV book by year:", error);
    throw error;
  }
}

export type StudentCVData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  study: string;
  cvFileId: string | null;
  cvFileUrl: string | null;
  linkedinUrl: string | null;
};

export type StudentCVGroup = {
  study: string;
  students: StudentCVData[];
};

/**
 * Get student CV data for a CV Book
 * Extracts student information from form responses using CV Book field mappings
 */
export async function getCVBookStudentData(cvBook: CVBook): Promise<StudentCVGroup[]> {
  try {
    const formId = typeof cvBook.form === "string" ? cvBook.form : cvBook.form.id;
    
    console.log("[getCVBookStudentData] CV Book:", {
      id: cvBook.id,
      formId,
      mappings: {
        firstName: cvBook.student_first_name_field,
        lastName: cvBook.student_last_name_field,
        email: cvBook.student_email_field,
        study: cvBook.student_study_field,
        cv: cvBook.student_cv_field,
      },
      backups: {
        firstName: cvBook.student_first_name_field_backup,
        lastName: cvBook.student_last_name_field_backup,
        email: cvBook.student_email_field_backup,
        study: cvBook.student_study_field_backup,
        cv: cvBook.student_cv_field_backup,
      },
    });
    
    // Fetch all form responses for all versions of the form
    const responses = await listFormResponsesForAllVersions(formId, { limit: -1 });
    
    console.log("[getCVBookStudentData] Fetched responses:", responses.length);
    
    if (responses.length === 0) {
      console.warn("[getCVBookStudentData] No form responses found for form:", formId);
      return [];
    }
    
    // Extract email from all responses first, then group by email and keep only the most recent one per email
    const responsesWithEmail: Array<{ response: FormResponse; email: string }> = [];
    for (const response of responses) {
      const data = response.data || {};
      const email = (data[cvBook.student_email_field] || 
                    (cvBook.student_email_field_backup ? data[cvBook.student_email_field_backup] : null)) as string;
      
      if (email) {
        responsesWithEmail.push({ response, email });
      }
    }
    
    // Group by email and keep only the most recent one per email
    const responsesByEmail = new Map<string, FormResponse>();
    for (const { response, email } of responsesWithEmail) {
      const existing = responsesByEmail.get(email);
      if (!existing || new Date(response.submitted_at) > new Date(existing.submitted_at)) {
        responsesByEmail.set(email, response);
      }
    }
    
    const uniqueResponses = Array.from(responsesByEmail.values());
    console.log(`[getCVBookStudentData] Filtered to ${uniqueResponses.length} unique students (by email) from ${responses.length} responses`);
    
    // Log first response structure for debugging
    if (uniqueResponses.length > 0) {
      console.log("[getCVBookStudentData] First response structure:", {
        id: uniqueResponses[0].id,
        dataKeys: Object.keys(uniqueResponses[0].data || {}),
        sampleData: uniqueResponses[0].data,
      });
    }
    
    // Extract student data from responses
    const studentData: StudentCVData[] = [];
    let skippedCount = 0;
    const skipReasons: Record<string, number> = {};
    
    for (const response of uniqueResponses) {
      const data = response.data || {};
      
      // Extract fields using CV Book mappings (with backup fallback)
      let firstName = (data[cvBook.student_first_name_field] || 
                        (cvBook.student_first_name_field_backup ? data[cvBook.student_first_name_field_backup] : null)) as string;
      let lastName = (data[cvBook.student_last_name_field] || 
                       (cvBook.student_last_name_field_backup ? data[cvBook.student_last_name_field_backup] : null)) as string;
      const email = (data[cvBook.student_email_field] || 
                    (cvBook.student_email_field_backup ? data[cvBook.student_email_field_backup] : null)) as string;
      const study = (data[cvBook.student_study_field] || 
                    (cvBook.student_study_field_backup ? data[cvBook.student_study_field_backup] : null)) as string;
      const cvFileId = (data[cvBook.student_cv_field] || 
                       (cvBook.student_cv_field_backup ? data[cvBook.student_cv_field_backup] : null)) as string | null;
      const linkedinRaw = (cvBook.student_linkedin_field ? (data[cvBook.student_linkedin_field] || 
                       (cvBook.student_linkedin_field_backup ? data[cvBook.student_linkedin_field_backup] : null)) : null) as string | null;
      const linkedinUrl = linkedinRaw && typeof linkedinRaw === "string" && linkedinRaw.trim() &&
        /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?(\?.*)?$/i.test(linkedinRaw.trim())
        ? linkedinRaw.trim()
        : null;
      
      // If firstName/lastName are missing, try to extract from _student_full_name
      if (!firstName || !lastName) {
        const fullName = (data['_student_full_name'] as string) || null;
        if (fullName) {
          const nameParts = fullName.trim().split(/\s+/);
          if (nameParts.length >= 2) {
            // Assume first part is first name, rest is last name
            firstName = firstName || nameParts[0];
            lastName = lastName || nameParts.slice(1).join(' ');
          } else if (nameParts.length === 1) {
            // Only one name part - use as first name
            firstName = firstName || nameParts[0];
            lastName = lastName || '';
          }
        }
      }
      
      // Debug: log what we found
      if (responses.indexOf(response) < 3) { // Log first 3 for debugging
        console.log(`[getCVBookStudentData] Response ${response.id}:`, {
          firstName: firstName || "MISSING",
          lastName: lastName || "MISSING",
          email: email || "MISSING",
          study: study || "MISSING",
          cvFileId: cvFileId || "MISSING",
          availableFields: Object.keys(data),
        });
      }
      
      // Skip if required fields are missing
      if (!firstName) {
        skipReasons['missing_firstName'] = (skipReasons['missing_firstName'] || 0) + 1;
        skippedCount++;
        continue;
      }
      if (!lastName) {
        skipReasons['missing_lastName'] = (skipReasons['missing_lastName'] || 0) + 1;
        skippedCount++;
        continue;
      }
      if (!email) {
        skipReasons['missing_email'] = (skipReasons['missing_email'] || 0) + 1;
        skippedCount++;
        continue;
      }
      if (!study) {
        skipReasons['missing_study'] = (skipReasons['missing_study'] || 0) + 1;
        skippedCount++;
        continue;
      }
      if (!cvFileId) {
        skipReasons['missing_cvFileId'] = (skipReasons['missing_cvFileId'] || 0) + 1;
        skippedCount++;
        continue;
      }
      
      // Get CV file URL - use API route to avoid CORS issues
      let cvFileUrl: string | null = null;
      if (cvFileId) {
        // Use API route to proxy the file with authentication
        cvFileUrl = `/api/cv-file/${cvFileId}`;
      }
      
      studentData.push({
        id: response.id,
        firstName,
        lastName,
        email,
        study,
        cvFileId,
        cvFileUrl,
        linkedinUrl,
      });
    }
    
    console.log(`[getCVBookStudentData] Extracted ${studentData.length} students from ${responses.length} responses`);
    console.log(`[getCVBookStudentData] Skipped ${skippedCount} responses:`, skipReasons);
    
    if (studentData.length === 0) {
      console.warn("[getCVBookStudentData] No valid student data extracted. Check field mappings!");
      // Log available fields from first response for debugging
      if (responses.length > 0 && responses[0].data) {
        console.log("[getCVBookStudentData] Available fields in first response:", Object.keys(responses[0].data));
        console.log("[getCVBookStudentData] First response data sample:", JSON.stringify(responses[0].data, null, 2).substring(0, 500));
      }
    }
    
    // Group by study
    const grouped = new Map<string, StudentCVData[]>();
    for (const student of studentData) {
      if (!grouped.has(student.study)) {
        grouped.set(student.study, []);
      }
      grouped.get(student.study)!.push(student);
    }
    
    // Convert to array and sort studies alphabetically
    const groups: StudentCVGroup[] = Array.from(grouped.entries())
      .map(([study, students]) => ({
        study,
        students: students.sort((a, b) => {
          // Sort by last name, then first name
          const lastNameCompare = a.lastName.localeCompare(b.lastName);
          return lastNameCompare !== 0 ? lastNameCompare : a.firstName.localeCompare(b.firstName);
        }),
      }))
      .sort((a, b) => a.study.localeCompare(b.study));
    
    console.log(`[getCVBookStudentData] Returning ${groups.length} study groups`);
    
    return groups;
  } catch (error) {
    console.error("[getCVBookStudentData] Error getting student CV data:", error);
    throw error;
  }
}

export async function getCVBookById(id: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
    return client.request(
      readItem("CV_Book", id, {
        fields: [
          "*",
          "year.*",
          "form.id",
          "form.name",
          "form.slug",
        ],
      })
    ) as unknown as CVBook;
  } catch (error) {
    console.error("[getCVBookById] Error getting CV book:", error);
    throw error;
  }
}

export async function createCVBook(data: {
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
  active?: boolean;
}) {
  try {
    const client = await getAuthedDirectusOrThrow();
    console.log("[createCVBook] Creating CV book with data:", data);
    const result = await client.request(
      createItem("CV_Book", {
        ...data,
        active: data.active ?? false, // Default to false if not provided
      })
    ) as unknown as CVBook;
    console.log("[createCVBook] Created CV book:", result);
    return result;
  } catch (error) {
    console.error("[createCVBook] Error creating CV book:", error);
    throw error;
  }
}

export async function updateCVBook(id: string, data: Partial<CVBook>) {
  try {
    const client = await getAuthedDirectusOrThrow();
    return client.request(
      updateItem("CV_Book", id, data)
    ) as unknown as CVBook;
  } catch (error) {
    console.error("[updateCVBook] Error updating CV book:", error);
    throw error;
  }
}

export async function deleteCVBook(id: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
    await client.request(deleteItem("CV_Book", id));
    return true;
  } catch (error) {
    console.error("[deleteCVBook] Error deleting CV book:", error);
    throw error;
  }
}

