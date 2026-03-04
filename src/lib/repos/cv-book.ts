// lib/repos/cv-book.ts
"use server";

import { readItems, readItem, createItem, updateItem, deleteItem } from "@directus/sdk";
import { getAuthedDirectusOrThrow, getAdminDirectusClient } from "@/lib/directus";

/** Client for CV book operations. Prefers admin token (bypasses Directus role permissions) when available. */
async function getCVBookClient() {
  const adminClient = getAdminDirectusClient();
  if (adminClient) return adminClient;
  return getAuthedDirectusOrThrow();
}
import type { CVBook, AcademicYear, FormResponse } from "@/lib/schema";
import { listFormResponsesForAllVersions } from "./forms";
import { listScreeningForCVBook, type CVBookScreeningRecord, type ScreeningStatus } from "./cv-book-screening";

function extractFormResponseId(rec: Record<string, unknown>): string | null {
  const fr = rec.form_response ?? rec.form_response_id;
  if (typeof fr === "string" && fr) return fr;
  if (typeof fr === "number" && !Number.isNaN(fr)) return String(fr);
  if (fr && typeof fr === "object" && "id" in fr) return String((fr as { id: unknown }).id);
  return null;
}

function normalizeScreeningStatus(raw: unknown): ScreeningStatus {
  if (raw === "approved" || raw === "rejected" || raw === "pending") return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      if (p === "approved" || p === "rejected" || p === "pending") return p;
    } catch {
      if (raw.trim() === "approved" || raw.trim() === "rejected" || raw.trim() === "pending") return raw.trim() as ScreeningStatus;
    }
  }
  return "pending";
}

// ===================== ACADEMIC YEARS =====================

export async function listAcademicYears(opts?: {
  search?: string;
  limit?: number;
  page?: number;
  sort?: string;
}) {
  try {
    const client = await getCVBookClient();
    const { search, limit = 100, page = 1, sort = "-start_of_year" } = opts ?? {};

    return client.request(
      readItems("academic_year", {
        fields: ["*"],
        limit,
        page,
        sort: sort as any,
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
    const client = await getCVBookClient();
    return client.request(
      readItem("academic_year", id, {
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
    screening_complete?: boolean;
  };
}) {
  try {
    const client = await getCVBookClient();
    const { search, limit = 100, page = 1, sort = "-date_created", filter } = opts ?? {};

    const filterObj: any = {};
    if (filter?.active !== undefined) {
      filterObj.active = { _eq: filter.active };
    }
    if (filter?.screening_complete !== undefined) {
      filterObj.screening_complete = { _eq: filter.screening_complete };
    }

    // Fetch cv_book. Directus checks permissions on nested collections (academic_year, forms)
    // when expanding relations - if that fails with 403, retry with base fields only (year/form as IDs).
    const baseQuery = {
      limit,
      page,
      sort: sort as any,
      ...(search ? { search } : {}),
      ...(Object.keys(filterObj).length > 0 ? { filter: filterObj } : {}),
    };

    try {
      return (await client.request(
        readItems("CV_Book" as any, {
          ...baseQuery,
          fields: ["*", { year: ["*"], form: ["id", "name", "slug"] } as any],
        } as any)
      )) as unknown as CVBook[];
    } catch (nestedError: unknown) {
      const is403 =
        nestedError &&
        typeof nestedError === "object" &&
        "response" in nestedError &&
        (nestedError as { response?: Response }).response?.status === 403;
      if (is403) {
        // Nested expansion/sort 403: token may lack read on academic_year/forms. Use base fields
        // and sort by date_created (avoids joining to year).
        const fallbackQuery = { ...baseQuery, fields: ["*"] as const, sort: "-date_created" as const };
        return (await client.request(readItems("CV_Book" as any, fallbackQuery as any))) as unknown as CVBook[];
      }
      throw nestedError;
    }
  } catch (error) {
    console.error("[listCVBooks] Error listing CV books:", error);
    throw error;
  }
}

/** Active CV books for companies: only show when screening is complete */
export async function getActiveCVBooks() {
  try {
    return await listCVBooks({
      filter: { active: true, screening_complete: true },
      sort: "-year.start_of_year", // Most recent year first
    });
  } catch (error) {
    console.error("[getActiveCVBooks] Error getting active CV books:", error);
    throw error;
  }
}

export async function getCVBookByYear(yearId: string) {
  try {
    const client = await getCVBookClient();
    const cvBooks = await client.request(
      readItems("CV_Book" as any, {
        fields: [
          "*",
          { year: ["*"], form: ["id", "name", "slug"] } as any
        ],
        filter: {
          year: { _eq: yearId },
          active: { _eq: true },
        },
        limit: 1,
      } as any)
    ) as unknown as CVBook[];

    return cvBooks.length > 0 ? cvBooks[0] : null;
  } catch (error) {
    console.error("[getCVBookByYear] Error getting CV book by year:", error);
    throw error;
  }
}

/** Get CV Book by year for admin screening (ignores active/screening_complete) */
export async function getCVBookByYearForScreening(yearId: string): Promise<CVBook | null> {
  try {
    const client = await getCVBookClient();
    const cvBooks = (await client.request(
      readItems("CV_Book" as any, {
        fields: ["*", { year: ["*"], form: ["id", "name", "slug"] } as any],
        filter: { year: { _eq: yearId } },
        limit: 1,
        sort: "-date_created",
      } as any)
    )) as unknown as CVBook[];
    return cvBooks.length > 0 ? cvBooks[0] : null;
  } catch (error) {
    console.error("[getCVBookByYearForScreening] Error:", error);
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
  /** When the form was submitted (for admin screening view) */
  submittedAt?: string;
  /** Screening status (when forScreening: true) - from CV_Book_screening collection */
  screeningStatus?: ScreeningStatus;
  /** Full screening record (when forScreening: true) - for study_override etc */
  screeningRecord?: CVBookScreeningRecord;
};

export type StudentCVGroup = {
  study: string;
  students: StudentCVData[];
};

/**
 * Get student CV data for a CV Book
 * Extracts student information from form responses using CV Book field mappings
 * @param opts.forScreening - When true, returns all CVs with submittedAt for admin screening. When false, filters to approved only.
 */
export async function getCVBookStudentData(
  cvBook: CVBook,
  opts?: { forScreening?: boolean }
): Promise<StudentCVGroup[]> {
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

    // Get account ID from response: student_id relation or data._student_id
    function getAccountId(response: FormResponse): string | null {
      const sid = response.student_id;
      if (sid) {
        return typeof sid === "string" ? sid : (sid as { id: string }).id;
      }
      const data = response.data as Record<string, unknown> | undefined;
      return (data?._student_id as string) || null;
    }

    // Group by student account and keep only the most recent response per account (1 CV per account)
    const responsesByAccount = new Map<string, FormResponse>();
    const responsesWithoutAccount: FormResponse[] = [];

    for (const response of responses) {
      const accountId = getAccountId(response);
      if (accountId) {
        const existing = responsesByAccount.get(accountId);
        if (!existing || new Date(response.submitted_at) > new Date(existing.submitted_at)) {
          responsesByAccount.set(accountId, response);
        }
      } else {
        // No account link - keep each response (e.g. submitted without login)
        responsesWithoutAccount.push(response);
      }
    }

    const uniqueResponses = [
      ...Array.from(responsesByAccount.values()),
      ...responsesWithoutAccount,
    ];
    console.log(`[getCVBookStudentData] Filtered to ${uniqueResponses.length} unique entries (${responsesByAccount.size} by account + ${responsesWithoutAccount.length} without account) from ${responses.length} responses`);

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
        ...(opts?.forScreening && { submittedAt: response.submitted_at }),
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

    // Fetch screening records and match to students (same flow for both screening and company view)
    const screeningRecords = await listScreeningForCVBook(cvBook.id);
    const screeningByFormResponse = new Map<string, CVBookScreeningRecord>();
    for (const rec of screeningRecords) {
      const frId = extractFormResponseId(rec);
      if (frId) screeningByFormResponse.set(String(frId).toLowerCase(), rec);
    }

    // Attach screening to each student (match case-insensitively for UUIDs)
    const studentsWithScreening = studentData.map((s) => {
      const rec = screeningByFormResponse.get(String(s.id).toLowerCase());
      const status = rec ? normalizeScreeningStatus(rec.status) : undefined;
      return {
        ...s,
        screeningStatus: status,
        screeningRecord: rec,
      };
    });

    // Apply study_override for both screening and company views
    const withStudyOverride = studentsWithScreening.map((s) => {
      const studyOverride = s.screeningRecord?.study_override;
      return studyOverride ? { ...s, study: studyOverride } : s;
    });

    let finalStudentData = withStudyOverride;
    if (!opts?.forScreening) {
      // Company view: only show CVs that went through screening and are not rejected
      // (have screening record + approved or pending; new unscreened CVs stay hidden)
      finalStudentData = withStudyOverride.filter((s) => {
        if (!s.screeningRecord) return false;
        return s.screeningStatus !== "rejected";
      });
    }

    // Group by study
    const grouped = new Map<string, StudentCVData[]>();
    for (const student of finalStudentData) {
      const studyKey = student.study;
      if (!grouped.has(studyKey)) {
        grouped.set(studyKey, []);
      }
      grouped.get(studyKey)!.push(student);
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
    const client = await getCVBookClient();
    return client.request(
      readItem("CV_Book" as any, id, {
        fields: [
          "*",
          { year: ["*"], form: ["id", "name", "slug"] } as any
        ],
      } as any)
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
    const client = await getCVBookClient();
    console.log("[createCVBook] Creating CV book with data:", data);
    const result = await client.request(
      createItem("CV_Book" as any, {
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
    const client = await getCVBookClient();
    return client.request(
      updateItem("CV_Book" as any, id, data)
    ) as unknown as CVBook;
  } catch (error) {
    console.error("[updateCVBook] Error updating CV book:", error);
    throw error;
  }
}

export async function deleteCVBook(id: string) {
  try {
    const client = await getCVBookClient();
    await client.request(deleteItem("CV_Book" as any, id));
    return true;
  } catch (error) {
    console.error("[deleteCVBook] Error deleting CV book:", error);
    throw error;
  }
}

