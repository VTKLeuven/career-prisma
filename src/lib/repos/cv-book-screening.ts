// lib/repos/cv-book-screening.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getUserFromCookies } from "@/lib/auth-server";

export type ScreeningStatus = "pending" | "approved" | "rejected";

/**
 * `status` is a JSON column (it was a Directus Dropdown backed by JSON), so the
 * stored values are JSON strings: "approved" / "rejected". Prisma decodes those
 * to plain JS strings on read and encodes them back on write, which removes the
 * escaping dance the Directus version needed -- it was sending
 * JSON.stringify(status) and unpicking values like "\"rejected\"" on the way
 * back out. This guard stays only to keep an unexpected value from leaking
 * through as a status.
 */
function normalizeStatus(raw: unknown): ScreeningStatus {
  if (raw === "approved" || raw === "rejected" || raw === "pending") return raw;
  return "pending";
}

export type CVBookScreeningRecord = {
  id: string;
  cv_book: string;
  form_response: string;
  status: ScreeningStatus;
  study_override?: string | null;
  screened_at?: string;
  screened_by?: string | null;
};

/** Ids cross the API as strings but the columns are integers. */
const num = (v: string | number) => Number(v);

function shapeRecord(row: Record<string, any>): CVBookScreeningRecord {
  return {
    id: String(row.id),
    cv_book: row.cv_book == null ? "" : String(row.cv_book),
    form_response: row.form_response == null ? "" : String(row.form_response),
    status: normalizeStatus(row.status),
    study_override: row.study_override ?? null,
    screened_at: row.screened_at ?? undefined,
    screened_by: row.screened_by ?? null,
  };
}

/** Get all screening records for a CV Book */
export async function listScreeningForCVBook(cvBookId: string): Promise<CVBookScreeningRecord[]> {
  try {
    const rows = await prisma.cvBookScreening.findMany({
      where: { cv_book: num(cvBookId) },
    });
    return rows.map(shapeRecord);
  } catch (error) {
    console.error("[listScreeningForCVBook] Error:", error);
    return [];
  }
}

/** Get screening record for a form response in a CV Book */
export async function getScreeningRecord(
  cvBookId: string,
  formResponseId: string
): Promise<CVBookScreeningRecord | null> {
  try {
    const row = await prisma.cvBookScreening.findFirst({
      where: { cv_book: num(cvBookId), form_response: num(formResponseId) },
    });
    return row ? shapeRecord(row) : null;
  } catch (error) {
    console.error("[getScreeningRecord] Error:", error);
    return null;
  }
}

/**
 * Get screening map (form_response_id -> record). Used by getCVBookStudentData.
 *
 * The Directus version had to try three column spellings (form_response,
 * form_response_id, form_responses_id) and unwrap possibly-expanded relations,
 * because `depth` was not reliably suppressed. The column is `form_response`.
 */
export async function getScreeningMap(
  cvBookId: string
): Promise<Map<string, CVBookScreeningRecord>> {
  const records = await listScreeningForCVBook(cvBookId);
  const map = new Map<string, CVBookScreeningRecord>();
  for (const r of records) {
    if (!r.form_response) continue;
    map.set(r.form_response, r);
  }
  return map;
}

/** Approve or reject a CV */
export async function setScreeningStatus(
  cvBookId: string,
  formResponseId: string,
  status: ScreeningStatus,
  studyOverride?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUserFromCookies();
    const screenedBy = user?.id ?? null;

    const where = { cv_book: num(cvBookId), form_response: num(formResponseId) };
    const existing = await prisma.cvBookScreening.findFirst({
      where,
      select: { id: true },
    });

    const data = {
      status,
      screened_at: new Date(),
      screened_by: screenedBy,
      study_override: studyOverride ?? null,
    };

    if (existing) {
      await prisma.cvBookScreening.update({ where: { id: existing.id }, data });
    } else {
      await prisma.cvBookScreening.create({
        data: { ...where, ...data, date_created: new Date() },
      });
    }
    return { success: true };
  } catch (error) {
    console.error("[setScreeningStatus] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update screening",
    };
  }
}

/** Delete a CV from the CV Book (reject) */
export async function rejectCV(
  cvBookId: string,
  formResponseId: string
): Promise<{ success: boolean; error?: string }> {
  return setScreeningStatus(cvBookId, formResponseId, "rejected");
}

/** Approve a CV */
export async function approveCV(
  cvBookId: string,
  formResponseId: string,
  studyOverride?: string | null
): Promise<{ success: boolean; error?: string }> {
  return setScreeningStatus(cvBookId, formResponseId, "approved", studyOverride);
}

/** Update study override for a CV */
export async function updateStudyOverride(
  cvBookId: string,
  formResponseId: string,
  studyOverride: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUserFromCookies();
    const screenedBy = user?.id ?? null;

    const where = { cv_book: num(cvBookId), form_response: num(formResponseId) };
    const existing = await prisma.cvBookScreening.findFirst({
      where,
      select: { id: true },
    });

    if (existing) {
      await prisma.cvBookScreening.update({
        where: { id: existing.id },
        data: {
          study_override: studyOverride,
          screened_at: new Date(),
          screened_by: screenedBy,
        },
      });
    } else {
      await prisma.cvBookScreening.create({
        data: {
          ...where,
          status: "pending",
          study_override: studyOverride,
          screened_at: new Date(),
          screened_by: screenedBy,
          date_created: new Date(),
        },
      });
    }
    return { success: true };
  } catch (error) {
    console.error("[updateStudyOverride] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update study",
    };
  }
}

/** Mark CV Book as screening complete and ready for companies */
export async function markCVBookScreeningComplete(
  cvBookId: string,
  complete: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.cvBook.update({
      where: { id: num(cvBookId) },
      data: { screening_complete: complete },
    });
    return { success: true };
  } catch (error) {
    console.error("[markCVBookScreeningComplete] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update CV Book",
    };
  }
}
