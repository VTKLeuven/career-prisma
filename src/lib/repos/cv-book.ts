// lib/repos/cv-book.ts
"use server";

import { prisma } from "@/lib/prisma";
import type { CVBook, AcademicYear, FormResponse } from "@/lib/schema";
import { listFormResponsesForAllVersions } from "./forms";
import { listScreeningForCVBook, type CVBookScreeningRecord, type ScreeningStatus } from "./cv-book-screening";

/** Ids cross this API as strings; the columns are integers. */
const num = (v: string | number) => Number(v);

/** `year` is expanded; `form` carries only the fields the UI reads. */
const CV_BOOK_INCLUDE = {
  year: true,
  form: { select: { id: true, name: true, slug: true } },
} as const;

function shapeCVBook(row: Record<string, any> | null): CVBook | null {
  if (!row) return null;
  const { year_id, form_id, ...rest } = row;
  return { ...rest, year: row.year ?? year_id ?? null, form: row.form ?? form_id ?? null } as CVBook;
}

// ===================== ACADEMIC YEARS =====================

export async function listAcademicYears(opts?: {
  search?: string;
  limit?: number;
  page?: number;
  sort?: string;
}) {
  try {
    const { search, limit = 100, page = 1, sort = "-start_of_year" } = opts ?? {};
    const desc = sort.startsWith("-");
    const sortField = desc ? sort.slice(1) : sort;

    return (await prisma.academicYear.findMany({
      where: search ? { name: { contains: search, mode: "insensitive" } } : undefined,
      orderBy: { [sortField]: desc ? "desc" : "asc" },
      take: limit,
      skip: (page - 1) * limit,
    })) as unknown as AcademicYear[];
  } catch (error) {
    console.error("[listAcademicYears] Error listing academic years:", error);
    throw error;
  }
}

export async function getAcademicYearById(id: string) {
  try {
    return (await prisma.academicYear.findUnique({
      where: { id: num(id) },
    })) as unknown as AcademicYear;
  } catch (error) {
    console.error("[getAcademicYearById] Error getting academic year:", error);
    throw error;
  }
}

// ===================== CV BOOKS =====================

/**
 * The Directus version wrapped this in a 403 retry: expanding `year` and `form`
 * triggered permission checks on those collections, and when the token lacked
 * read access it fell back to unexpanded ids and a different sort order. There
 * is no permission layer to trip over now, so the expansion is unconditional.
 */
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
    const { search, limit = 100, page = 1, sort = "-date_created", filter } = opts ?? {};

    const desc = sort.startsWith("-");
    const sortField = desc ? sort.slice(1) : sort;
    const dir = desc ? "desc" : "asc";

    // Callers pass nested sort keys such as "-year.start_of_year".
    const orderBy = sortField.includes(".")
      ? sortField.split(".").reduceRight<Record<string, unknown>>(
          (acc, key) => ({ [key]: acc }),
          dir as unknown as Record<string, unknown>
        )
      : { [sortField]: dir };

    const rows = await prisma.cvBook.findMany({
      where: {
        ...(filter?.active !== undefined ? { active: filter.active } : {}),
        ...(filter?.screening_complete !== undefined
          ? { screening_complete: filter.screening_complete }
          : {}),
        ...(search ? { form: { name: { contains: search, mode: "insensitive" } } } : {}),
      },
      include: CV_BOOK_INCLUDE,
      orderBy: orderBy as any,
      take: limit,
      skip: (page - 1) * limit,
    });

    return rows.map((r) => shapeCVBook(r)!) as CVBook[];
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
    const row = await prisma.cvBook.findFirst({
      where: { year_id: num(yearId), active: true },
      include: CV_BOOK_INCLUDE,
    });
    return shapeCVBook(row);
  } catch (error) {
    console.error("[getCVBookByYear] Error getting CV book by year:", error);
    throw error;
  }
}

/** Get CV Book by year for admin screening (ignores active/screening_complete) */
export async function getCVBookByYearForScreening(yearId: string): Promise<CVBook | null> {
  try {
    const row = await prisma.cvBook.findFirst({
      where: { year_id: num(yearId) },
      include: CV_BOOK_INCLUDE,
      orderBy: { date_created: "desc" },
    });
    return shapeCVBook(row);
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
  /** Screening status (when forScreening: true) - from cv_book_screenings */
  screeningStatus?: ScreeningStatus;
  /** Full screening record (when forScreening: true) - for study_override etc */
  screeningRecord?: CVBookScreeningRecord;
};

export type StudentCVGroup = {
  study: string;
  students: StudentCVData[];
};

/**
 * Get student CV data for a CV Book.
 * Extracts student information from form responses using CV Book field mappings.
 * @param opts.forScreening - When true, returns all CVs with submittedAt for admin
 *   screening. When false, filters to screened and not-rejected only.
 */
export async function getCVBookStudentData(
  cvBook: CVBook,
  opts?: { forScreening?: boolean }
): Promise<StudentCVGroup[]> {
  try {
    const formId = typeof cvBook.form === "string" ? cvBook.form : String((cvBook.form as { id: unknown }).id);

    // Fetch all form responses for all versions of the form
    const responses = await listFormResponsesForAllVersions(formId, { limit: -1 });

    if (responses.length === 0) {
      console.warn("[getCVBookStudentData] No form responses found for form:", formId);
      return [];
    }

    // Get account ID from response: student_id relation or data._student_id
    function getAccountId(response: FormResponse): string | null {
      const sid = response.student_id;
      if (sid) {
        return typeof sid === "string" ? sid : String((sid as { id: unknown }).id);
      }
      const data = response.data as Record<string, unknown> | undefined;
      return (data?._student_id as string) || null;
    }

    // Group by student account and keep only the most recent response per account
    // (1 CV per account)
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

      studentData.push({
        id: String(response.id),
        firstName,
        lastName,
        email,
        study,
        cvFileId,
        // Proxied through an API route so the file is served with auth.
        cvFileUrl: `/api/cv-file/${cvFileId}`,
        linkedinUrl,
        ...(opts?.forScreening && { submittedAt: response.submitted_at }),
      });
    }

    if (skippedCount > 0) {
      // Field names only: the values are student PII and must not reach the logs.
      console.warn(
        `[getCVBookStudentData] Skipped ${skippedCount}/${uniqueResponses.length} responses:`,
        skipReasons
      );
    }

    if (studentData.length === 0 && responses.length > 0) {
      console.warn(
        "[getCVBookStudentData] No valid student data extracted. Check field mappings. Available fields:",
        Object.keys(responses[0].data ?? {})
      );
    }

    // Fetch screening records and match to students
    const screeningRecords = await listScreeningForCVBook(String(cvBook.id));
    const screeningByFormResponse = new Map<string, CVBookScreeningRecord>();
    for (const rec of screeningRecords) {
      if (rec.form_response) {
        screeningByFormResponse.set(rec.form_response.toLowerCase(), rec);
      }
    }

    // Attach screening to each student (match case-insensitively for UUIDs)
    const studentsWithScreening = studentData.map((s) => {
      const rec = screeningByFormResponse.get(String(s.id).toLowerCase());
      return {
        ...s,
        screeningStatus: rec?.status,
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
      // Company view: only show CVs that went through screening and are not
      // rejected (new unscreened CVs stay hidden).
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
    return Array.from(grouped.entries())
      .map(([study, students]) => ({
        study,
        students: students.sort((a, b) => {
          // Sort by last name, then first name
          const lastNameCompare = a.lastName.localeCompare(b.lastName);
          return lastNameCompare !== 0 ? lastNameCompare : a.firstName.localeCompare(b.firstName);
        }),
      }))
      .sort((a, b) => a.study.localeCompare(b.study));
  } catch (error) {
    console.error("[getCVBookStudentData] Error getting student CV data:", error);
    throw error;
  }
}

export async function getCVBookById(id: string) {
  try {
    const row = await prisma.cvBook.findUnique({
      where: { id: num(id) },
      include: CV_BOOK_INCLUDE,
    });
    return shapeCVBook(row) as CVBook;
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
    const { year, form, ...rest } = data;
    const row = await prisma.cvBook.create({
      data: {
        ...rest,
        year_id: num(year),
        form_id: num(form),
        active: data.active ?? false, // Default to false if not provided
        date_created: new Date(),
      },
      include: CV_BOOK_INCLUDE,
    });
    return shapeCVBook(row) as CVBook;
  } catch (error) {
    console.error("[createCVBook] Error creating CV book:", error);
    throw error;
  }
}

export async function updateCVBook(id: string, data: Partial<CVBook>) {
  try {
    const { year, form, id: _id, ...rest } = data as Record<string, any>;
    const idOf = (v: any) => (v && typeof v === "object" ? v.id : v);

    const row = await prisma.cvBook.update({
      where: { id: num(id) },
      data: {
        ...rest,
        ...(year !== undefined ? { year_id: year == null ? null : num(idOf(year)) } : {}),
        ...(form !== undefined ? { form_id: form == null ? null : num(idOf(form)) } : {}),
        date_updated: new Date(),
      },
      include: CV_BOOK_INCLUDE,
    });
    return shapeCVBook(row) as CVBook;
  } catch (error) {
    console.error("[updateCVBook] Error updating CV book:", error);
    throw error;
  }
}

export async function deleteCVBook(id: string) {
  try {
    const bookId = num(id);
    // Favourites and screening records reference the book and do not cascade.
    await prisma.$transaction(async (tx) => {
      await tx.cvBookFavourite.deleteMany({ where: { cv_book: bookId } });
      await tx.cvBookScreening.deleteMany({ where: { cv_book: bookId } });
      await tx.cvBook.delete({ where: { id: bookId } });
    });
    return true;
  } catch (error) {
    console.error("[deleteCVBook] Error deleting CV book:", error);
    throw error;
  }
}
