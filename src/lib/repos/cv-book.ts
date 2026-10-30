// lib/repos/cv-book.ts
import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CVBook, AcademicYear, FormResponse, FormSchema } from "@/lib/schema";
import { listFormResponsesForAllVersions } from "./forms";
import { listScreeningForCVBook, type CVBookScreeningRecord, type ScreeningStatus } from "./cv-book-screening";
import { getCurrentAcademicYear } from "./academic-year";
import { listCVBookOptOuts } from "./students";
import { GRANT_TYPES, type CVBookGrantConfig } from "@/lib/grants";

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

/**
 * Published books (`active`), the one switch that decides whether companies
 * can see a book. It used to take a second flag, `screening_complete` ("Mark
 * ready for companies"), which also bulk-approved every unscreened CV; that
 * defeated the manual check, so it is gone and the column is unused.
 */
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

/** Get CV Book by year for admin screening (published or not) */
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
  /** The student opted out of the CV book; only the screening view still lists them. */
  withdrawn?: boolean;
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

    const bookResponses = await responsesForBook(cvBook, formId, responses);
    const studyLabel = await studyLabeler(cvBook, formId);
    const optOuts = await listCVBookOptOuts();

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

    for (const response of bookResponses) {
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
      const study = studyLabel(data[cvBook.student_study_field] ||
                    (cvBook.student_study_field_backup ? data[cvBook.student_study_field_backup] : null));
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
        withdrawn:
          optOuts.ids.has(String(getAccountId(response))) ||
          (typeof email === "string" && optOuts.emails.has(email.trim().toLowerCase())),
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
      // Company view: only CVs an admin approved -- unscreened ones, and
      // "pending" records left by a study correction, stay hidden -- and never
      // a student who opted out.
      finalStudentData = withStudyOverride.filter(
        (s) => s.screeningStatus === "approved" && !s.withdrawn
      );
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

/**
 * The responses that belong to this book. One form can feed several books --
 * /forms/cv-book collects CVs year after year -- and a book used to show every
 * response the form ever had, so each year's book was the same list. A
 * response now belongs to the book whose academic year had most recently
 * started when it was submitted; the oldest book also keeps anything sent
 * before its year began, so no CV falls between two books. A form behind a
 * single book is not filtered at all.
 */
async function responsesForBook<T extends Pick<FormResponse, "submitted_at">>(
  cvBook: CVBook,
  formId: string,
  responses: T[]
): Promise<T[]> {
  const siblings = await prisma.cvBook.findMany({
    where: { form_id: num(formId) },
    select: { id: true, year: { select: { start_of_year: true } } },
  });
  if (siblings.length < 2) return responses;

  const startOf = (b: (typeof siblings)[number]) => b.year?.start_of_year?.getTime() ?? null;
  const own = siblings.find((b) => String(b.id) === String(cvBook.id));
  const ownStart = own ? startOf(own) : null;
  if (ownStart == null) return responses;

  const starts = siblings.map(startOf).filter((t): t is number => t != null);
  const nextStart = Math.min(Infinity, ...starts.filter((t) => t > ownStart));
  const isOldest = !starts.some((t) => t < ownStart);

  return responses.filter((r) => {
    const submitted = r.submitted_at ? new Date(r.submitted_at).getTime() : NaN;
    // An undated response counts as older than every book.
    const t = Number.isNaN(submitted) ? -Infinity : submitted;
    return (isOldest || t >= ownStart) && t < nextStart;
  });
}

/**
 * Masters by id and faculties by id, for turning master-degrees answers into
 * names. Those answers are ids -- a master id, or `fac:<faculty>:<master>` /
 * `fac:<faculty>` when the field groups by faculty (lib/form-fields.ts).
 */
async function masterDegreeNames() {
  const [masters, faculties] = await Promise.all([
    prisma.master.findMany({ select: { id: true, name: true } }),
    prisma.faculty.findMany({ select: { id: true, name: true, facultyMasters: { select: { id: true } } } }),
  ]);
  return { masters, faculties };
}

/** Whether the book's study field (or its backup) is a master-degrees field in any version. */
async function studyFieldIsMasterDegrees(cvBook: CVBook, formId: string): Promise<boolean> {
  const names = [cvBook.student_study_field, cvBook.student_study_field_backup].filter(Boolean);
  const versions = await prisma.formVersion.findMany({
    where: { form_id: num(formId) },
    select: { schema: true },
  });
  return versions.some((v) =>
    ((v.schema as FormSchema | null)?.fields ?? []).some(
      (f) => names.includes(f.name) && f.type === "master-degrees"
    )
  );
}

/**
 * Turns a stored study answer into the text the book groups by. A select
 * stores that text already; a multi-choice answer is a list, joined; and a
 * master-degrees answer stores ids, which become master or faculty names. An
 * id that no longer resolves is shown as stored, so the admin can still
 * correct it with the study override.
 */
async function studyLabeler(cvBook: CVBook, formId: string): Promise<(value: unknown) => string> {
  const join = (values: string[]) => values.filter(Boolean).join(", ");
  if (!(await studyFieldIsMasterDegrees(cvBook, formId))) {
    return (value) => (Array.isArray(value) ? join(value.map(String)) : value == null ? "" : String(value));
  }

  const { masters, faculties } = await masterDegreeNames();
  const masterName = new Map(masters.map((m) => [String(m.id), m.name ?? ""]));
  const facultyName = new Map(faculties.map((f) => [String(f.id), f.name ?? ""]));
  const one = (raw: string) => {
    const grouped = /^fac:([^:]+)(?::(.+))?$/.exec(raw);
    if (grouped) {
      const name = grouped[2] ? masterName.get(grouped[2]) : facultyName.get(grouped[1]);
      return name || raw;
    }
    return masterName.get(raw) || raw;
  };
  return (value) => {
    if (value == null || value === "") return "";
    return join((Array.isArray(value) ? value : [value]).map((v) => one(String(v))));
  };
}

/**
 * The studies an admin can pick in screening when the study field is a
 * master-degrees field, whose options live in /admin/masters rather than on
 * the field: every master, plus faculties without masters. Null for any other
 * field type, which carries its own options.
 */
export async function masterDegreeStudyOptions(cvBook: CVBook): Promise<string[] | null> {
  const formId = typeof cvBook.form === "string" ? cvBook.form : String((cvBook.form as { id: unknown }).id);
  if (!(await studyFieldIsMasterDegrees(cvBook, formId))) return null;
  const { masters, faculties } = await masterDegreeNames();
  const names = [
    ...masters.map((m) => m.name),
    ...faculties.filter((f) => f.facultyMasters.length === 0).map((f) => f.name),
  ].filter((n): n is string => Boolean(n));
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

// ===================== COMPANY ACCESS =====================

/** A sub-option whose grants include a CV book. */
const GRANTS_CV_BOOK = { grants: { some: { type: "cv_book" } } };
const CV_BOOK_GRANTS = { grants: { where: { type: "cv_book" } } };

/**
 * The CV books a company bought, from the `cv_book` grants (lib/grants.ts) on
 * the sub-options it bought -- on their own or inside a package. A grant
 * opens the book of the year it was sold in, or specific books (how an older
 * book is sold); either way it is kept for good. Names play no part.
 */
export async function listCVBookAccessForCompany(
  companyId: string
): Promise<{ yearIds: string[]; bookIds: string[] }> {
  const [direct, viaPackage] = await Promise.all([
    prisma.companyCareerSubOption.findMany({
      where: { company_id: companyId, status: "sold", careerSubOption: GRANTS_CV_BOOK },
      select: { academic_year_id: true, careerSubOption: { select: CV_BOOK_GRANTS } },
    }),
    prisma.companyCareerEventOption.findMany({
      where: {
        company_id: companyId,
        status: "sold",
        careerEventOption: { careerEventOptionSubOptions: { some: { careerSubOption: GRANTS_CV_BOOK } } },
      },
      select: {
        academic_year_id: true,
        careerEventOption: {
          select: {
            careerEventOptionSubOptions: {
              where: { careerSubOption: GRANTS_CV_BOOK },
              select: { careerSubOption: { select: CV_BOOK_GRANTS } },
            },
          },
        },
      },
    }),
  ]);

  const sales = [
    ...direct.map((d) => ({ yearId: d.academic_year_id, grants: d.careerSubOption.grants })),
    ...viaPackage.flatMap((p) =>
      p.careerEventOption.careerEventOptionSubOptions.map((link) => ({
        yearId: p.academic_year_id,
        grants: link.careerSubOption?.grants ?? [],
      }))
    ),
  ];

  const yearIds = new Set<string>();
  const bookIds = new Set<string>();
  for (const sale of sales) {
    for (const grant of sale.grants) {
      let config: CVBookGrantConfig;
      try {
        config = GRANT_TYPES.cv_book.parseConfig(grant.config);
      } catch {
        continue; // A broken config grants nothing rather than everything.
      }
      if (config.scope === "books") config.bookIds.forEach((id) => bookIds.add(String(id)));
      else yearIds.add(String(sale.yearId));
    }
  }
  return { yearIds: Array.from(yearIds), bookIds: Array.from(bookIds) };
}

/** Whether the company bought any CV book -- the CV book page or the offer to buy one. */
export async function companyHasAnyCVBookAccess(companyId: string): Promise<boolean> {
  const { yearIds, bookIds } = await listCVBookAccessForCompany(companyId);
  return yearIds.length > 0 || bookIds.length > 0;
}

/** Whether the company already bought this academic year's CV book. */
export async function companyHasCurrentYearCVBook(companyId: string): Promise<boolean> {
  const [{ yearIds }, year] = await Promise.all([
    listCVBookAccessForCompany(companyId),
    getCurrentAcademicYear(),
  ]);
  return Boolean(year && yearIds.includes(String(year.id)));
}

/** The books a company may open: published (`active`), and bought -- by year or by book. */
export async function listCVBooksForCompany(companyId: string): Promise<CVBook[]> {
  const { yearIds, bookIds } = await listCVBookAccessForCompany(companyId);
  if (yearIds.length === 0 && bookIds.length === 0) return [];
  const rows = await prisma.cvBook.findMany({
    where: {
      active: true,
      OR: [{ year_id: { in: yearIds.map(num) } }, { id: { in: bookIds.map(num) } }],
    },
    include: CV_BOOK_INCLUDE,
    orderBy: { year: { start_of_year: "desc" } },
  });
  return rows.map((r) => shapeCVBook(r)!);
}

/** Whether the company may open this book (see listCVBooksForCompany). */
export async function canCompanyOpenCVBook(companyId: string, cvBookId: string): Promise<boolean> {
  const books = await listCVBooksForCompany(companyId);
  return books.some((b) => String(b.id) === String(cvBookId));
}

/**
 * Whether the file is the CV of a student this company can see -- in a book
 * it may open, approved, and not opted out. Built on the same list the
 * company's CV book page shows, so the two cannot disagree.
 */
export async function companyCanSeeCVFile(companyId: string, fileId: string): Promise<boolean> {
  for (const book of await listCVBooksForCompany(companyId)) {
    const groups = await getCVBookStudentData(book);
    if (groups.some((g) => g.students.some((s) => s.cvFileId === fileId))) return true;
  }
  return false;
}

// ===================== CV FILE PRIVACY =====================

/**
 * Marks the CVs in CV books private (files.private), so /api/files only
 * serves them to an admin, a company that can see them, or the student who
 * uploaded them. Runs after every submission to a CV-book form and whenever a
 * book is created or remapped; the migration that added the column did the
 * same for the CVs already there. Narrowed to one form when given.
 */
export async function markCVFilesPrivate(formId?: string | number | null): Promise<void> {
  const formFilter =
    formId != null && Number.isSafeInteger(Number(formId))
      ? Prisma.sql`AND b.form_id = ${Number(formId)}`
      : Prisma.empty;
  await prisma.$executeRaw`
    UPDATE files f
    SET private = true
    FROM cv_books b
    JOIN form_versions v ON v.form_id = b.form_id
    JOIN form_responses r ON r.form_version_id = v.id
    CROSS JOIN LATERAL (
      SELECT r.data -> b.student_cv_field AS val
      UNION ALL
      SELECT r.data -> b.student_cv_field_backup
    ) cv
    WHERE f.private = false ${formFilter}
      AND (
        (jsonb_typeof(cv.val) = 'string' AND cv.val #>> '{}' = f.id::text)
        OR (jsonb_typeof(cv.val) = 'array' AND cv.val ? f.id::text)
      )`;
}

/**
 * Where a signed-in student's submission to this form starts counting as new.
 * A student has one response per form, updated on every resubmit; for a form
 * that feeds a CV book that would keep a CV in the year it was first sent,
 * forever. From the current academic year's start a resubmit makes a new
 * response, so each year's book gets its own. Null for any other form.
 */
export async function cvBookResponseWindowStart(formId: string | number): Promise<Date | null> {
  const id = Number(formId);
  if (!Number.isSafeInteger(id)) return null;
  const hasBook = await prisma.cvBook.findFirst({ where: { form_id: id }, select: { id: true } });
  if (!hasBook) return null;
  const year = await getCurrentAcademicYear();
  return year?.start_of_year ? new Date(year.start_of_year) : null;
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
    await markCVFilesPrivate(row.form_id);
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
    await markCVFilesPrivate(row.form_id);
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
