// lib/repos/forms.ts
"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Form, FormVersion, FormResponse, FormSchema, FormMetadata, FormField } from "@/lib/schema";

/**
 * Ids cross this API as strings; forms, versions and responses use integer keys.
 * Returns null for anything non-numeric so callers can bail rather than query
 * with NaN.
 */
const num = (v: string | number): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const nums = (vs: Array<string | number>): number[] =>
  vs.map(num).filter((n): n is number => n != null);

/** Directus returned `form_versions` nested under the form; consumers still read that. */
const FORM_INCLUDE = { formVersions: { orderBy: { version_number: "desc" as const } } } as const;

function shapeForm(row: Record<string, any> | null): Form | null {
  if (!row) return null;
  const { formVersions, ...rest } = row;
  return { ...rest, form_versions: formVersions ?? [] } as Form;
}

/**
 * Archived responses are excluded everywhere the student/company dedupe
 * matters. `archived` is nullable, so NULL counts as not archived.
 *
 * NOTE: this is an `OR`, so it must never be spread into the same object
 * literal as another `OR` -- the second key wins and this filter vanishes
 * without any error. Combine them with `AND: [NOT_ARCHIVED, other]` instead.
 */
const NOT_ARCHIVED = { OR: [{ archived: null }, { archived: false }] };

/**
 * `data._student_id` is stored as a JSON *number*, not a string.
 *
 * The Directus code compared it with `===` against a string-typed studentId,
 * which is false for 553 === "553"; it only worked because callers happened to
 * pass a number despite the annotation. Matching on both representations makes
 * it correct regardless of what the caller passes.
 *
 * This is also why the JSON columns were migrated to jsonb: Prisma's JSON
 * filters compile to jsonb operators and silently match nothing against a
 * `json` column.
 */
function studentIdMatch(studentId: string | number) {
  const asString = String(studentId);
  const asNumber = Number(studentId);
  const alternatives: Prisma.FormResponseWhereInput[] = [
    { data: { path: ["_student_id"], equals: asString } },
    { data: { path: ["student_id"], equals: asString } },
  ];
  if (Number.isFinite(asNumber)) {
    alternatives.push(
      { data: { path: ["_student_id"], equals: asNumber } },
      { data: { path: ["student_id"], equals: asNumber } }
    );
  }
  return { OR: alternatives };
}

// ===================== FORMS =====================

export async function listForms(opts?: {
  search?: string;
  limit?: number;
  page?: number;
  sort?: string;
}) {
  try {
    const { search, limit = 25, page = 1, sort = "-created_at" } = opts ?? {};
    const desc = sort.startsWith("-");
    const sortField = desc ? sort.slice(1) : sort;

    const rows = await prisma.form.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: FORM_INCLUDE,
      orderBy: { [sortField]: desc ? "desc" : "asc" },
      take: limit,
      skip: (page - 1) * limit,
    });

    return rows.map((r) => shapeForm(r)!) as Form[];
  } catch (error) {
    console.error("[listForms] Error listing forms:", error);
    throw error;
  }
}

export async function getFormById(id: string) {
  try {
    const formId = num(id);
    if (formId == null) return null as unknown as Form;
    const row = await prisma.form.findUnique({ where: { id: formId }, include: FORM_INCLUDE });
    return shapeForm(row) as Form;
  } catch (error) {
    console.error("Error getting form by id:", error);
    throw error;
  }
}

export async function getFormBySlug(slug: string) {
  try {
    const row = await prisma.form.findUnique({ where: { slug }, include: FORM_INCLUDE });
    return shapeForm(row);
  } catch (error) {
    console.error("[getFormBySlug] Error getting form by slug:", error);
    throw error;
  }
}

/**
 * Directus needed a separate public-client variant of the slug lookup because
 * the authenticated client would 403 for anonymous visitors. There is no
 * permission layer now, so this is the same query; the export is kept so
 * callers do not have to change.
 */
export async function getPublicFormBySlug(slug: string) {
  try {
    const row = await prisma.form.findUnique({ where: { slug }, include: FORM_INCLUDE });
    return shapeForm(row);
  } catch (error) {
    console.error("[getPublicFormBySlug] Error getting public form by slug:", error);
    throw error;
  }
}

export async function createForm(data: Partial<Form> & { metadata?: unknown }) {
  try {
    // metadata belongs on the version, not the form
    const { metadata, id: _id, form_versions: _versions, ...formData } = data as Record<string, any>;
    const row = await prisma.form.create({
      data: { ...formData, created_at: new Date(), updated_at: new Date() } as Prisma.FormCreateInput,
      include: FORM_INCLUDE,
    });
    return shapeForm(row) as Form;
  } catch (error) {
    console.error("Error creating form:", error);
    throw error;
  }
}

export async function updateForm(id: string, data: Partial<Form>) {
  try {
    const formId = num(id);
    if (formId == null) throw new Error("Invalid form id");
    const { id: _id, form_versions: _versions, ...rest } = data as Record<string, any>;

    const row = await prisma.form.update({
      where: { id: formId },
      data: { ...rest, updated_at: new Date() },
      include: FORM_INCLUDE,
    });
    return shapeForm(row) as Form;
  } catch (error) {
    console.error("Error updating form:", error);
    throw error;
  }
}

/**
 * Delete a form with its versions and responses.
 *
 * The Directus version deleted every response one HTTP request at a time; a
 * form with a few thousand responses meant a few thousand round trips. This is
 * three statements in a transaction, so it is also atomic -- previously a
 * failure part-way left the form half-deleted.
 */
export async function deleteForm(id: string) {
  try {
    const formId = num(id);
    if (formId == null) return true;

    await prisma.$transaction(async (tx) => {
      const versions = await tx.formVersion.findMany({
        where: { form_id: formId },
        select: { id: true },
      });
      const versionIds = versions.map((v) => v.id);

      if (versionIds.length > 0) {
        // Responses are referenced by scans, favourites and screenings, none of
        // which cascade.
        const responses = await tx.formResponse.findMany({
          where: { form_version_id: { in: versionIds } },
          select: { id: true },
        });
        const responseIds = responses.map((r) => r.id);
        if (responseIds.length > 0) {
          await tx.attendantScan.deleteMany({ where: { form_response_id: { in: responseIds } } });
          await tx.cvBookFavourite.deleteMany({ where: { form_response: { in: responseIds } } });
          await tx.cvBookScreening.deleteMany({ where: { form_response: { in: responseIds } } });
          await tx.formResponse.deleteMany({ where: { id: { in: responseIds } } });
        }
        await tx.formVersion.deleteMany({ where: { id: { in: versionIds } } });
      }

      await tx.form.delete({ where: { id: formId } });
    });

    return true;
  } catch (error) {
    console.error("Error deleting form:", error);
    throw error;
  }
}

// ===================== FORM VERSIONS =====================

export async function listFormVersions(formId: string) {
  try {
    const id = num(formId);
    if (id == null) return [] as unknown as FormVersion[];
    return (await prisma.formVersion.findMany({
      where: { form_id: id },
      orderBy: { version_number: "desc" },
    })) as unknown as FormVersion[];
  } catch (error) {
    console.error("Error listing form versions:", error);
    throw error;
  }
}

/** Same query as listFormVersions; kept because callers import it by name. */
export async function listFormVersionsForServer(formId: string): Promise<FormVersion[]> {
  try {
    const id = num(formId);
    if (id == null) return [];
    return (await prisma.formVersion.findMany({
      where: { form_id: id },
      orderBy: { version_number: "desc" },
    })) as unknown as FormVersion[];
  } catch (error) {
    console.error("[listFormVersionsForServer] Error:", error);
    return [];
  }
}

export async function getFormVersionById(id: string) {
  try {
    const versionId = num(id);
    if (versionId == null) return null as unknown as FormVersion;
    const row = await prisma.formVersion.findUnique({
      where: { id: versionId },
      include: { form: true },
    });
    if (!row) return null as unknown as FormVersion;
    const { form, ...rest } = row;
    return { ...rest, form_id: form ?? rest.form_id } as unknown as FormVersion;
  } catch (error) {
    console.error("Error getting form version:", error);
    throw error;
  }
}

export async function createFormVersion(data: {
  form_id: string;
  schema: FormSchema;
  version_number: number;
  is_active?: boolean;
  metadata?: FormMetadata;
}) {
  try {
    const formId = num(data.form_id);
    if (formId == null) throw new Error("Invalid form id");

    const row = await prisma.$transaction(async (tx) => {
      // Only one version may be active at a time.
      if (data.is_active) {
        await tx.formVersion.updateMany({
          where: { form_id: formId, is_active: true },
          data: { is_active: false },
        });
      }
      return tx.formVersion.create({
        data: {
          form_id: formId,
          schema: data.schema as unknown as Prisma.InputJsonValue,
          version_number: data.version_number,
          is_active: data.is_active ?? false,
          metadata: (data.metadata as unknown as Prisma.InputJsonValue) ?? Prisma.DbNull,
          created_at: new Date(),
        },
      });
    });

    return row as unknown as FormVersion;
  } catch (error) {
    console.error("Error creating form version:", error);
    throw error;
  }
}

export async function updateFormVersion(id: string, data: Partial<FormVersion>) {
  try {
    const versionId = num(id);
    if (versionId == null) throw new Error("Invalid form version id");

    const { id: _id, form_id, schema, metadata, ...rest } = data as Record<string, any>;

    const row = await prisma.$transaction(async (tx) => {
      if (data.is_active) {
        const current = await tx.formVersion.findUnique({
          where: { id: versionId },
          select: { form_id: true },
        });
        if (current?.form_id != null) {
          await tx.formVersion.updateMany({
            where: { form_id: current.form_id, is_active: true, id: { not: versionId } },
            data: { is_active: false },
          });
        }
      }

      return tx.formVersion.update({
        where: { id: versionId },
        data: {
          ...rest,
          ...(form_id !== undefined
            ? { form_id: num(typeof form_id === "object" ? form_id.id : form_id) }
            : {}),
          ...(schema !== undefined ? { schema: schema as Prisma.InputJsonValue } : {}),
          ...(metadata !== undefined
            ? { metadata: (metadata as Prisma.InputJsonValue) ?? Prisma.DbNull }
            : {}),
        },
      });
    });

    return row as unknown as FormVersion;
  } catch (error) {
    console.error("[updateFormVersion] Error updating form version:", error);
    throw error;
  }
}

export async function deleteFormVersion(id: string) {
  try {
    const versionId = num(id);
    if (versionId == null) return true;

    await prisma.$transaction(async (tx) => {
      const responses = await tx.formResponse.findMany({
        where: { form_version_id: versionId },
        select: { id: true },
      });
      const responseIds = responses.map((r) => r.id);
      if (responseIds.length > 0) {
        await tx.attendantScan.deleteMany({ where: { form_response_id: { in: responseIds } } });
        await tx.cvBookFavourite.deleteMany({ where: { form_response: { in: responseIds } } });
        await tx.cvBookScreening.deleteMany({ where: { form_response: { in: responseIds } } });
        await tx.formResponse.deleteMany({ where: { id: { in: responseIds } } });
      }
      await tx.formVersion.delete({ where: { id: versionId } });
    });

    return true;
  } catch (error) {
    console.error("Error deleting form version:", error);
    throw error;
  }
}

export async function getActiveFormVersion(formId: string) {
  try {
    const id = num(formId);
    if (id == null) return null;
    return (await prisma.formVersion.findFirst({
      where: { form_id: id, is_active: true },
    })) as unknown as FormVersion | null;
  } catch (error) {
    console.error("Error getting active form version:", error);
    throw error;
  }
}

/** Same query as getActiveFormVersion; kept because callers import it by name. */
export async function getActiveFormVersionForServer(formId: string): Promise<FormVersion | null> {
  try {
    const id = num(formId);
    if (id == null) return null;
    return (await prisma.formVersion.findFirst({
      where: { form_id: id, is_active: true },
    })) as unknown as FormVersion | null;
  } catch (error) {
    console.error("[getActiveFormVersionForServer] Error:", error);
    return null;
  }
}

// ===================== FORM RESPONSES =====================

/**
 * Archive this student's previous responses to a form.
 *
 * Previously this fetched every response across all versions of the form and
 * compared `data._student_id` in JavaScript, then issued one PATCH per match.
 * With jsonb the match happens in the database and the archive is one UPDATE.
 */
export async function archivePreviousStudentResponsesForForm(
  studentId: string,
  formId: string
): Promise<void> {
  try {
    const id = num(formId);
    if (id == null) return;

    await prisma.formResponse.updateMany({
      where: {
        formVersion: { form_id: id },
        ...studentIdMatch(studentId),
      },
      data: { archived: true },
    });
  } catch (error) {
    console.error("[archivePreviousStudentResponsesForForm] Error:", error);
    // Non-fatal: continue with submission
  }
}

/** Archive all previous form responses from this company for the given form. */
export async function archivePreviousCompanyResponsesForForm(
  companyId: string,
  formId: string
): Promise<void> {
  try {
    const id = num(formId);
    if (id == null) return;

    await prisma.formResponse.updateMany({
      where: { formVersion: { form_id: id }, company_id: companyId },
      data: { archived: true },
    });
  } catch (error) {
    console.error("[archivePreviousCompanyResponsesForForm] Error:", error);
    // Non-fatal: continue with submission
  }
}

/** Archive duplicate student/company responses for a form, keeping only the most recent per student or company. */
export async function archiveDuplicateResponsesForForm(formId: string): Promise<{ archived: number }> {
  try {
    const id = num(formId);
    if (id == null) return { archived: 0 };

    const responses = await prisma.formResponse.findMany({
      where: { formVersion: { form_id: id }, ...NOT_ARCHIVED },
      select: { id: true, data: true, company_id: true, submitted_at: true },
      orderBy: { submitted_at: "desc" },
    });

    // Group by dedupe key: company_id for company forms, _student_id for student forms
    const byKey = new Map<string, typeof responses>();
    for (const r of responses) {
      const data = r.data as Record<string, unknown> | null;
      const studentId = data?._student_id;
      const key = r.company_id
        ? `company:${r.company_id}`
        : studentId != null
          ? `student:${String(studentId)}`
          : undefined;
      if (key) {
        const list = byKey.get(key) ?? [];
        list.push(r);
        byKey.set(key, list);
      }
    }

    // Keep the first of each group (most recent by sort), archive the rest.
    const toArchive: number[] = [];
    for (const [, list] of byKey) {
      if (list.length <= 1) continue;
      for (const r of list.slice(1)) toArchive.push(r.id);
    }

    if (toArchive.length === 0) return { archived: 0 };

    const { count } = await prisma.formResponse.updateMany({
      where: { id: { in: toArchive } },
      data: { archived: true },
    });
    return { archived: count };
  } catch (error) {
    console.error("[archiveDuplicateResponsesForForm] Error:", error);
    throw error;
  }
}

/** Relations Directus expanded on a response listing. */
const RESPONSE_INCLUDE = {
  company: { select: { id: true, name: true } },
  formVersion: { select: { id: true, version_number: true, form: { select: { name: true } } } },
} as const;

export async function listFormResponses(formVersionId: string, opts?: {
  limit?: number;
  page?: number;
}) {
  try {
    const versionId = num(formVersionId);
    if (versionId == null) return [] as unknown as FormResponse[];
    const { limit = 25, page = 1 } = opts ?? {};

    return (await prisma.formResponse.findMany({
      where: { form_version_id: versionId, ...NOT_ARCHIVED },
      include: RESPONSE_INCLUDE,
      orderBy: { submitted_at: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    })) as unknown as FormResponse[];
  } catch (error) {
    console.error("Error listing form responses:", error);
    throw error;
  }
}

/** Counts previously fetched every row and took .length; this is a COUNT. */
export async function getFormResponsesTotalCount(formVersionId: string) {
  try {
    const versionId = num(formVersionId);
    if (versionId == null) return 0;
    return await prisma.formResponse.count({
      where: { form_version_id: versionId, ...NOT_ARCHIVED },
    });
  } catch (error) {
    console.error("Error counting form responses:", error);
    return 0;
  }
}

export async function getFirstFormResponse(formVersionId: string) {
  try {
    const versionId = num(formVersionId);
    if (versionId == null) return null;
    const row = await prisma.formResponse.findFirst({
      where: { form_version_id: versionId, ...NOT_ARCHIVED },
      select: { submitted_at: true },
      orderBy: { submitted_at: "asc" },
    });
    // Directus returned an ISO string here and callers store it in string state.
    return row ? { submitted_at: row.submitted_at?.toISOString() ?? null } : null;
  } catch (error) {
    console.error("Error getting first form response:", error);
    return null;
  }
}

export async function getLatestFormResponse(formVersionId: string) {
  try {
    const versionId = num(formVersionId);
    if (versionId == null) return null;
    const row = await prisma.formResponse.findFirst({
      where: { form_version_id: versionId, ...NOT_ARCHIVED },
      select: { submitted_at: true },
      orderBy: { submitted_at: "desc" },
    });
    // Directus returned an ISO string here and callers store it in string state.
    return row ? { submitted_at: row.submitted_at?.toISOString() ?? null } : null;
  } catch (error) {
    console.error("Error getting latest form response:", error);
    return null;
  }
}

/** Batch: get latest form response data for multiple students. Returns Map<studentId, data>. */
export async function getStudentFormResponsesBatchForForm(
  formId: string,
  studentIds: string[]
): Promise<Map<string, Record<string, unknown>>> {
  if (studentIds.length === 0) return new Map();
  const idSet = new Set(studentIds.map(String));
  try {
    const id = num(formId);
    if (id == null) return new Map();

    const responses = await prisma.formResponse.findMany({
      where: { formVersion: { form_id: id }, ...NOT_ARCHIVED },
      select: { id: true, form_version_id: true, data: true },
      orderBy: { submitted_at: "desc" },
    });

    const byStudent = new Map<string, Record<string, unknown>>();
    for (const r of responses) {
      const data = r.data as Record<string, unknown> | null;
      const fromData = data?._student_id ?? data?.student_id;
      const sid = fromData != null ? String(fromData) : null;
      if (sid != null && idSet.has(sid) && !byStudent.has(sid)) {
        byStudent.set(sid, data ?? {});
      }
    }
    return byStudent;
  } catch (error) {
    console.error("[getStudentFormResponsesBatchForForm] Error:", error);
    return new Map();
  }
}

/**
 * Get a student's latest response across the given form versions.
 *
 * The Directus version fetched every response for those versions (all 5398 in
 * the production dataset) and scanned for a match in JavaScript. The student
 * filter now runs in the database.
 */
export async function getStudentLatestFormResponseForForm(
  studentId: string,
  versionIds: string[]
): Promise<{ id: string; form_version_id: string; data: Record<string, unknown>; attendant_uuid?: string } | null> {
  if (versionIds.length === 0) return null;
  try {
    const ids = nums(versionIds);
    if (ids.length === 0) return null;

    const match = await prisma.formResponse.findFirst({
      where: {
        form_version_id: { in: ids },
        // Both of these are OR-shaped, so they are combined with AND rather
        // than spread into one object (see the note on NOT_ARCHIVED).
        AND: [NOT_ARCHIVED, studentIdMatch(studentId)],
      },
      select: { id: true, form_version_id: true, data: true, attendant_uuid: true },
      orderBy: { submitted_at: "desc" },
    });

    return match
      ? {
          id: String(match.id),
          form_version_id: String(match.form_version_id),
          data: (match.data as Record<string, unknown>) ?? {},
          attendant_uuid: match.attendant_uuid ?? undefined,
        }
      : null;
  } catch (error) {
    console.error("[getStudentLatestFormResponseForForm] Error:", error);
    return null;
  }
}

export type ScanningColumns = {
  university?: string;
  faculty?: string;
  master?: string;
  year_of_study?: string;
};

/** Get event registration form response data for students. Returns Map<studentId, { data, scanning_columns }>. */
export async function getStudentFormResponseDataForEvent(
  eventId: string,
  studentIds: string[]
): Promise<Map<string, { data: Record<string, unknown>; scanning_columns?: ScanningColumns }>> {
  if (studentIds.length === 0) return new Map();
  const idSet = new Set(studentIds.map(String));
  try {
    // metadata.is_event_registration / event_id live inside a jsonb blob, so the
    // versions are selected in application code as before.
    const versions = await prisma.formVersion.findMany({
      select: { id: true, metadata: true },
    });

    const versionIds: number[] = [];
    const versionToScanningColumns = new Map<number, ScanningColumns>();
    for (const v of versions) {
      const meta = v.metadata as
        | { is_event_registration?: boolean; event_id?: string; scanning_columns?: ScanningColumns }
        | null;
      if (meta?.is_event_registration && String(meta.event_id) === String(eventId)) {
        versionIds.push(v.id);
        if (meta.scanning_columns) versionToScanningColumns.set(v.id, meta.scanning_columns);
      }
    }
    if (versionIds.length === 0) return new Map();

    const responses = await prisma.formResponse.findMany({
      where: { form_version_id: { in: versionIds }, ...NOT_ARCHIVED },
      select: { id: true, form_version_id: true, data: true, submitted_at: true },
      orderBy: { submitted_at: "desc" },
    });

    const byStudent = new Map<string, { data: Record<string, unknown>; scanning_columns?: ScanningColumns }>();
    for (const r of responses) {
      const data = r.data as Record<string, unknown> | null;
      const fromData = data?._student_id ?? data?.student_id;
      const sid = fromData != null ? String(fromData) : null;
      if (sid != null && idSet.has(sid) && !byStudent.has(sid)) {
        byStudent.set(sid, {
          data: data ?? {},
          scanning_columns:
            r.form_version_id != null ? versionToScanningColumns.get(r.form_version_id) : undefined,
        });
      }
    }
    return byStudent;
  } catch (error) {
    console.error("[Forms] getStudentFormResponseDataForEvent Error:", error);
    return new Map();
  }
}

// Fetch responses across all versions of a form
export async function listFormResponsesForAllVersions(formId: string, opts?: {
  limit?: number;
  page?: number;
}) {
  try {
    const id = num(formId);
    if (id == null) return [] as unknown as FormResponse[];
    const { limit = 25, page = 1 } = opts ?? {};

    return (await prisma.formResponse.findMany({
      where: { formVersion: { form_id: id }, ...NOT_ARCHIVED },
      include: RESPONSE_INCLUDE,
      orderBy: { submitted_at: "desc" },
      // Callers pass limit: -1 to mean "everything"; Prisma expresses that by
      // omitting `take`.
      ...(limit > 0 ? { take: limit, skip: (page - 1) * limit } : {}),
    })) as unknown as FormResponse[];
  } catch (error) {
    console.error("Error listing form responses for all versions:", error);
    throw error;
  }
}

export async function getFormResponsesTotalCountForAllVersions(formId: string) {
  try {
    const id = num(formId);
    if (id == null) return 0;
    return await prisma.formResponse.count({
      where: { formVersion: { form_id: id }, ...NOT_ARCHIVED },
    });
  } catch (error) {
    console.error("Error counting form responses for all versions:", error);
    return 0;
  }
}

export async function getFirstFormResponseForAllVersions(formId: string) {
  try {
    const id = num(formId);
    if (id == null) return null;
    const row = await prisma.formResponse.findFirst({
      where: { formVersion: { form_id: id }, ...NOT_ARCHIVED },
      select: { submitted_at: true },
      orderBy: { submitted_at: "asc" },
    });
    return row ? { submitted_at: row.submitted_at?.toISOString() ?? null } : null;
  } catch (error) {
    console.error("Error getting first form response for all versions:", error);
    return null;
  }
}

export async function getLatestFormResponseForAllVersions(formId: string) {
  try {
    const id = num(formId);
    if (id == null) return null;
    const row = await prisma.formResponse.findFirst({
      where: { formVersion: { form_id: id }, ...NOT_ARCHIVED },
      select: { submitted_at: true },
      orderBy: { submitted_at: "desc" },
    });
    return row ? { submitted_at: row.submitted_at?.toISOString() ?? null } : null;
  } catch (error) {
    console.error("Error getting latest form response for all versions:", error);
    return null;
  }
}

export async function getFormResponseById(id: string) {
  try {
    const responseId = num(id);
    if (responseId == null) return null as unknown as FormResponse;
    return (await prisma.formResponse.findUnique({
      where: { id: responseId },
      include: { formVersion: true, company: true },
    })) as unknown as FormResponse;
  } catch (error) {
    console.error("Error getting form response:", error);
    throw error;
  }
}

export async function createFormResponse(data: {
  form_version_id: string;
  user_id?: string;
  data: Record<string, unknown>;
  attachments?: string[];
}) {
  try {
    const versionId = num(data.form_version_id);
    if (versionId == null) throw new Error("Invalid form version id");

    // `attachments` and `user_id` have no column on form_responses; Directus
    // accepted and discarded them, so they are dropped here too.
    const { form_version_id: _v, user_id: _u, attachments: _a, data: payload, ...rest } = data as Record<string, any>;

    return (await prisma.formResponse.create({
      data: {
        ...rest,
        form_version_id: versionId,
        data: payload as Prisma.InputJsonValue,
        submitted_at: new Date(),
      },
    })) as unknown as FormResponse;
  } catch (error) {
    console.error("Error creating form response:", error);
    throw error;
  }
}

export async function updateFormResponse(
  id: string,
  data: Partial<{
    data: Record<string, unknown>;
    submitter_first_name?: string;
    submitter_last_name?: string;
    submitter_email?: string;
  }>
) {
  try {
    const responseId = num(id);
    if (responseId == null) throw new Error("Invalid form response id");
    const { data: payload, ...rest } = data as Record<string, any>;

    return (await prisma.formResponse.update({
      where: { id: responseId },
      data: {
        ...rest,
        ...(payload !== undefined ? { data: payload as Prisma.InputJsonValue } : {}),
      },
    })) as unknown as FormResponse;
  } catch (error) {
    console.error("Error updating form response:", error);
    throw error;
  }
}

export async function deleteFormResponse(id: string) {
  try {
    const responseId = num(id);
    if (responseId == null) return true;
    await prisma.$transaction(async (tx) => {
      await tx.attendantScan.deleteMany({ where: { form_response_id: responseId } });
      await tx.cvBookFavourite.deleteMany({ where: { form_response: responseId } });
      await tx.cvBookScreening.deleteMany({ where: { form_response: responseId } });
      await tx.formResponse.delete({ where: { id: responseId } });
    });
    return true;
  } catch (error) {
    console.error("Error deleting form response:", error);
    throw error;
  }
}

/** Migrate master-degrees fields in form responses from label format to canonical (fac:facId:masterId). */
export async function migrateFormResponsesMasterDegrees(formId: string): Promise<{ updated: number; total: number }> {
  try {
    const { listMasters, listFaculties } = await import("@/lib/repos/features");
    const { buildMasterDegreeOptionsForForm, normalizeMasterDegreesValues, normalizeFaculties } = await import("@/lib/utils/master-degree-options");

    const id = num(formId);
    if (id == null) return { updated: 0, total: 0 };

    const form = await getFormById(formId);
    if (!form?.form_versions?.length) return { updated: 0, total: 0 };

    const masters = (await listMasters({ limit: 300, sort: "name" })) ?? [];
    const rawFaculties = (await listFaculties({ limit: 100, sort: "name" })) ?? [];
    const faculties = normalizeFaculties(rawFaculties);

    const sortedVersions = [...form.form_versions].sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0));
    const masterDegreeFieldsByKey = new Map<string, FormField>();
    for (const version of sortedVersions) {
      const fields = (version as FormVersion & { schema?: { fields?: FormField[] } })?.schema?.fields ?? [];
      for (const f of fields) {
        if (f.type === "master-degrees" && !masterDegreeFieldsByKey.has(f.name)) {
          masterDegreeFieldsByKey.set(f.name, f);
        }
      }
    }
    const masterDegreeFields = Array.from(masterDegreeFieldsByKey.values());
    if (masterDegreeFields.length === 0) return { updated: 0, total: 0 };

    const responses = await prisma.formResponse.findMany({
      where: { formVersion: { form_id: id } },
      select: { id: true, form_version_id: true, data: true },
    });

    let updated = 0;
    for (const response of responses) {
      const data = { ...((response.data as Record<string, unknown>) ?? {}) };
      let changed = false;
      for (const field of masterDegreeFields) {
        const fieldValue = data[field.name];
        if (fieldValue == null) continue;
        const includeFaculties = field.masterDegreesIncludeFaculties ?? false;
        const isMultiple = field.masterDegreesMultiple ?? false;
        const options = buildMasterDegreeOptionsForForm(masters, faculties, includeFaculties);
        const normalized = normalizeMasterDegreesValues(fieldValue, options, isMultiple, { masters, faculties });
        const current = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
        const currentStr = current
          .map((v) => (v != null && typeof v === "object" && ("id" in v || "value" in v || "label" in v)
            ? String((v as Record<string, unknown>).id ?? (v as Record<string, unknown>).value ?? (v as Record<string, unknown>).label ?? v)
            : String(v)))
          .filter(Boolean);
        if (JSON.stringify([...normalized].sort()) !== JSON.stringify([...currentStr].sort())) {
          data[field.name] = isMultiple ? normalized : normalized[0] ?? null;
          changed = true;
        }
      }
      if (changed) {
        await prisma.formResponse.update({
          where: { id: response.id },
          data: { data: data as Prisma.InputJsonValue },
        });
        updated++;
      }
    }
    return { updated, total: responses.length };
  } catch (error) {
    console.error("[migrateFormResponsesMasterDegrees] Error:", error);
    throw error;
  }
}

export async function countFormResponses(formId: string) {
  try {
    const id = num(formId);
    if (id == null) return 0;
    return await prisma.formResponse.count({
      where: { formVersion: { form_id: id }, ...NOT_ARCHIVED },
    });
  } catch (error) {
    console.error("Error counting form responses:", error);
    return 0; // Return 0 on error to avoid breaking the UI
  }
}

export async function countFormVersionResponses(formVersionId: string, _usePublic = false) {
  try {
    const versionId = num(formVersionId);
    if (versionId == null) return 0;
    return await prisma.formResponse.count({
      where: { form_version_id: versionId, ...NOT_ARCHIVED },
    });
  } catch (error) {
    console.error("Error counting form version responses:", error);
    return 0; // Return 0 on error to avoid breaking the UI
  }
}

/**
 * Initialize UUIDs for existing form responses that don't have them.
 * Only processes responses for event registration forms.
 */
export async function initializeAttendantUuids(formId?: string) {
  try {
    const scopedFormId = formId ? num(formId) : null;

    const versions = await prisma.formVersion.findMany({
      where: scopedFormId != null ? { form_id: scopedFormId } : undefined,
      select: { id: true, metadata: true },
    });

    const eventRegistrationVersionIds = versions
      .filter((v) => (v.metadata as { is_event_registration?: boolean } | null)?.is_event_registration)
      .map((v) => v.id);

    if (eventRegistrationVersionIds.length === 0) {
      return {
        success: true,
        message: formId
          ? "No event registration versions found for this form."
          : "No event registration forms found.",
        updated: 0,
      };
    }

    const responses = await prisma.formResponse.findMany({
      where: {
        form_version_id: { in: eventRegistrationVersionIds },
        OR: [{ attendant_uuid: null }, { attendant_uuid: "" }],
      },
      select: { id: true },
    });

    if (responses.length === 0) {
      return { success: true, message: "All responses already have UUIDs.", updated: 0 };
    }

    let updated = 0;
    const errors: string[] = [];
    for (const response of responses) {
      try {
        await prisma.formResponse.update({
          where: { id: response.id },
          data: { attendant_uuid: crypto.randomUUID() },
        });
        updated++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to update response ${response.id}: ${errorMsg}`);
      }
    }

    return {
      success: true,
      message: `Successfully initialized ${updated} response(s) with UUIDs.`,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Error initializing attendant UUIDs:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to initialize UUIDs",
      updated: 0,
    };
  }
}

// ===================== COMPANY FORMS =====================

/**
 * Company forms for an event, restricted to the options a company holds.
 *
 * Assignment is decided by the ACTIVE version's option_ids only: if an older
 * version was assigned to many options but the active one to a few, only those
 * few apply. `is_company_form`, `event_id` and `option_ids` all live inside the
 * version's jsonb metadata, so the selection stays in application code.
 *
 * The Directus version wrapped this in a network-error retry loop with
 * exponential backoff; a local database connection does not need it.
 */
export async function getCompanyFormsForEvent(
  eventId: string,
  companyOptionIds: string[],
  _retries = 2,
  /** When true, only return forms explicitly assigned via option_ids (excludes forms with empty option_ids) */
  requireOptionAssignment = false
) {
  try {
    const forms = await prisma.form.findMany({
      where: { is_active: true },
      include: FORM_INCLUDE,
    });

    const companyForms: Array<{
      id: string;
      name: string;
      slug: string;
      description?: string;
      metadata: FormMetadata;
      activeVersion: { id: string; version_number: number; schema: FormSchema };
    }> = [];

    // Option ids may arrive as strings, numbers or { id } objects.
    const normalizeOptionId = (id: unknown): string => {
      if (id == null) return "";
      if (typeof id === "string") return id;
      if (typeof id === "number") return String(id);
      if (typeof id === "object" && id !== null && "id" in id) return String((id as { id: unknown }).id);
      return String(id);
    };
    const companyOptionIdSet = new Set(companyOptionIds.map(normalizeOptionId).filter(Boolean));

    for (const form of forms) {
      const activeVersion = form.formVersions.find((v) => v.is_active);
      if (!activeVersion) continue;

      const metadata = activeVersion.metadata as FormMetadata | null;
      if (!metadata?.is_company_form) continue;
      if (String(metadata.event_id) !== String(eventId)) continue;

      const rawOptionIds = metadata.option_ids || [];
      if (requireOptionAssignment && rawOptionIds.length === 0) continue;
      if (rawOptionIds.length > 0) {
        const requiredIds = rawOptionIds.map(normalizeOptionId).filter(Boolean);
        const hasRequiredOption = requiredIds.some((optId) => companyOptionIdSet.has(optId));
        if (!hasRequiredOption) continue;
      }

      companyForms.push({
        id: String(form.id),
        name: form.name,
        slug: form.slug ?? "",
        description: form.description ?? undefined,
        metadata,
        activeVersion: {
          id: String(activeVersion.id),
          version_number: activeVersion.version_number,
          schema: activeVersion.schema as unknown as FormSchema,
        },
      });
    }

    return companyForms;
  } catch (error) {
    console.error("[getCompanyFormsForEvent] Error fetching company forms:", error);
    return [];
  }
}

/** Get ALL company forms for an event (for admin floorplan filtering). No company option filter. */
export async function getAllCompanyFormsForEvent(eventId: string) {
  try {
    const forms = await prisma.form.findMany({
      where: { is_active: true },
      include: FORM_INCLUDE,
    });

    const companyForms: Array<{
      id: string;
      name: string;
      slug: string;
      activeVersion: { id: string; version_number: number; schema: FormSchema };
    }> = [];

    for (const form of forms) {
      const activeVersion = form.formVersions.find((v) => v.is_active);
      if (!activeVersion) continue;

      const metadata = activeVersion.metadata as FormMetadata | null;
      if (!metadata?.is_company_form) continue;
      if (String(metadata.event_id) !== String(eventId)) continue;

      companyForms.push({
        id: String(form.id),
        name: form.name,
        slug: form.slug ?? "",
        activeVersion: {
          id: String(activeVersion.id),
          version_number: activeVersion.version_number,
          schema: activeVersion.schema as unknown as FormSchema,
        },
      });
    }

    return companyForms;
  } catch (error) {
    console.error("[getAllCompanyFormsForEvent] Error:", error);
    return [];
  }
}

/** Normalize for matching: trim, collapse spaces, lowercase, strip content in brackets. Treat "others" same as "other". */
function normalizeForMatch(s: string): string {
  let r = (s ?? "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\{[^}]*\}/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (r === "others") return "other";
  return r;
}

function valueMatchesOption(fieldValue: unknown, optionValue: string): boolean {
  if (fieldValue === optionValue) return true;
  if (fieldValue != null && String(fieldValue) === optionValue) return true;
  const normOpt = normalizeForMatch(optionValue);
  if (fieldValue != null && normalizeForMatch(String(fieldValue)) === normOpt) return true;
  if (Array.isArray(fieldValue)) {
    const arr = fieldValue as unknown[];
    const baseMatch = arr.some(
      (v) => v === optionValue || (v != null && normalizeForMatch(String(v)) === normOpt)
    );
    if (baseMatch) return true;
    // Match fac:facId:masterId with stored masterId (legacy forms may store just master id)
    const facMasterMatch = optionValue.match(/^fac:[^:]+:([^:]+)$/);
    if (facMasterMatch) {
      const masterId = facMasterMatch[1];
      if (arr.some((v) => v != null && String(v).trim() === masterId)) return true;
    }
    return false;
  }
  // Match fac:facId:masterId with stored masterId (legacy forms may store just master id)
  const facMasterMatch = optionValue.match(/^fac:[^:]+:([^:]+)$/);
  if (facMasterMatch && fieldValue != null) {
    const masterId = facMasterMatch[1];
    if (String(fieldValue).trim() === masterId) return true;
  }
  return false;
}

/** Get company IDs that have a form response where the given field matches the option value.
 * Form response data is keyed by field.name, not field.id. Uses normalized matching for master-degrees. */
export async function getCompanyIdsMatchingFormFieldOption(
  formVersionId: string,
  fieldName: string,
  optionValue: string
): Promise<string[]> {
  try {

    const responses = await prisma.formResponse.findMany({
      where: {
        form_version_id: Number(formVersionId),
        company_id: { not: null },
        ...NOT_ARCHIVED,
      },
      select: { id: true, company_id: true, data: true },
      orderBy: { submitted_at: "desc" },
    }) as unknown as Array<{ id: string; company_id: string | { id: string }; data: Record<string, unknown> }>;

    // Keep only latest response per company (responses sorted by -submitted_at)
    const latestByCompany = new Map<string, Record<string, unknown>>();
    for (const r of responses) {
      const companyId = typeof r.company_id === "string" ? r.company_id : r.company_id?.id;
      if (!companyId || latestByCompany.has(companyId)) continue;
      latestByCompany.set(companyId, r.data ?? {});
    }

    const companyIds: string[] = [];
    for (const [companyId, data] of latestByCompany) {
      const fieldValue = data[fieldName];
      if (valueMatchesOption(fieldValue, optionValue)) {
        companyIds.push(String(companyId));
      }
    }

    console.log("[floorplan-category] getCompanyIdsMatchingFormFieldOption", {
      formVersionId,
      fieldName,
      optionValue,
      totalResponses: latestByCompany.size,
      matchingCount: companyIds.length,
    });
    return companyIds;
  } catch (error) {
    console.error("[getCompanyIdsMatchingFormFieldOption] Error:", error);
    return [];
  }
}

/** Get form response field values for companies. Returns Map<companyId, displayValue>. Uses single form version. */
export async function getCompanyFormFieldValues(
  formVersionId: string,
  fieldName: string
): Promise<Record<string, string>> {
  try {

    const responses = await prisma.formResponse.findMany({
      where: {
        form_version_id: Number(formVersionId),
        company_id: { not: null },
        ...NOT_ARCHIVED,
      },
      select: { id: true, company_id: true, data: true },
      orderBy: { submitted_at: "desc" },
    }) as unknown as Array<{ id: string; company_id: string | { id: string }; data: Record<string, unknown> }>;

    const latestByCompany = new Map<string, Record<string, unknown>>();
    for (const r of responses) {
      const companyId = typeof r.company_id === "string" ? r.company_id : r.company_id?.id;
      if (!companyId || latestByCompany.has(companyId)) continue;
      latestByCompany.set(companyId, r.data ?? {});
    }

    const result: Record<string, string> = {};
    for (const [companyId, data] of latestByCompany) {
      const fieldValue = data[fieldName];
      if (fieldValue == null || fieldValue === "") continue;
      const display =
        Array.isArray(fieldValue)
          ? (fieldValue as unknown[]).map(String).join(", ")
          : String(fieldValue);
      if (display) result[companyId] = display;
    }
    return result;
  } catch (error) {
    console.error("[getCompanyFormFieldValues] Error:", error);
    return {};
  }
}

/** Get form response field values for companies across ALL form versions. Uses latest response per company. */
export async function getCompanyFormFieldValuesFromForm(
  formId: string,
  fieldName: string
): Promise<Record<string, string>> {
  try {

    const versions = await listFormVersionsForServer(formId);
    const versionIds = versions.map((v) => v.id);
    if (versionIds.length === 0) return {};

    const responses = await prisma.formResponse.findMany({
      where: {
        form_version_id: { in: nums(versionIds) },
        company_id: { not: null },
        ...NOT_ARCHIVED,
      },
      select: { id: true, company_id: true, data: true, submitted_at: true },
      orderBy: { submitted_at: "desc" },
    }) as unknown as Array<{ company_id: string | { id: string }; data: Record<string, unknown> }>;

    const latestByCompany = new Map<string, Record<string, unknown>>();
    for (const r of responses) {
      const companyId = typeof r.company_id === "string" ? r.company_id : r.company_id?.id;
      if (!companyId || latestByCompany.has(companyId)) continue;
      latestByCompany.set(companyId, r.data ?? {});
    }

    const result: Record<string, string> = {};
    for (const [companyId, data] of latestByCompany) {
      const fieldValue = data[fieldName];
      if (fieldValue == null || fieldValue === "") continue;
      const display =
        Array.isArray(fieldValue)
          ? (fieldValue as unknown[]).map(String).join(", ")
          : String(fieldValue);
      if (display) result[companyId] = display;
    }
    return result;
  } catch (error) {
    console.error("[getCompanyFormFieldValuesFromForm] Error:", error);
    return {};
  }
}

/** Get dedupe key for an option - same master/faculty = same key, so we don't show duplicates. */
function getOptionDedupeKey(opt: { value: string; label: string }, masters: { id: string; name: string }[]): string {
  const v = opt.value.trim();
  const norm = (s: string) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  if (norm(v) === "other" || norm(v) === "others") return "other";
  const facMaster = v.match(/^fac:[^:]+:([^:]+)$/);
  if (facMaster) return `master:${facMaster[1]}`;
  if (/^[0-9a-f-]{36}$/i.test(v)) return `master:${v}`;
  const facOnly = v.match(/^fac:([^:]+)$/);
  if (facOnly) return `fac:${facOnly[1]}`;
  const afterDash = v.split(" - ").pop()?.trim();
  const match = masters.find((m) => norm(m.name) === norm(afterDash ?? v));
  if (match) return `master:${match.id}`;
  return v;
}

export type FloorplanCategoryOption = { value: string; label: string; logo?: string };
export type FloorplanCategoryOptionGroup = { groupLabel: string; options: FloorplanCategoryOption[] };

/** Get floorplan category options from masters and faculties only. Returns grouped when faculties enabled. */
export async function getFloorplanCategoryOptions(
  categoryFields: Array<{ formId: string; formVersionId: string; fieldName: string }>
): Promise<{ groups: FloorplanCategoryOptionGroup[] }> {
  try {
    const { listMasters, listFaculties } = await import("@/lib/repos/features");
    const { buildMasterDegreeOptionsGrouped, normalizeFaculties } = await import("@/lib/utils/master-degree-options");

    const masters = (await listMasters({ limit: 300, sort: "name" })) ?? [];
    const rawFaculties = (await listFaculties({ limit: 100, sort: "name" })) ?? [];
    const faculties = normalizeFaculties(rawFaculties);

    let includeFaculties = false;
    for (const { formId, formVersionId, fieldName } of categoryFields) {
      const form = await getFormById(formId);
      if (!form?.form_versions) continue;
      const version = form.form_versions.find((v) => v.id === formVersionId) as FormVersion & { schema?: { fields?: FormField[] } };
      const field = version?.schema?.fields?.find((f) => f.name === fieldName);
      if (field?.type === "master-degrees") {
        includeFaculties = field.masterDegreesIncludeFaculties ?? false;
        break;
      }
    }

    const groups = buildMasterDegreeOptionsGrouped(masters, faculties, includeFaculties);
    return { groups };
  } catch (error) {
    console.error("[getFloorplanCategoryOptions] Error:", error);
    return { groups: [] };
  }
}

/** Get company IDs that have ALL selected values (in any of the configured form fields).
 * Uses same logic as getCompanyMasterDegreesFromForm: all form versions, normalize label->value. */
export async function getCompanyIdsMatchingFloorplanCategory(
  categoryFields: Array<{ formId: string; formVersionId: string; fieldName: string }>,
  selectedValues: string[]
): Promise<string[]> {
  if (selectedValues.length === 0) return [];
  try {
    const { listMasters, listFaculties } = await import("@/lib/repos/features");
    const { normalizeMasterDegreesValues, normalizeFaculties } = await import("@/lib/utils/master-degree-options");
    const { buildMasterDegreeOptionsForForm } = await import("@/lib/utils/master-degree-options");

    const masters = (await listMasters({ limit: 300, sort: "name" })) ?? [];
    const rawFaculties = (await listFaculties({ limit: 100, sort: "name" })) ?? [];
    const faculties = normalizeFaculties(rawFaculties);

    const extractVal = (v: unknown): string | null => {
      if (v == null) return null;
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "object" && v !== null) {
        const o = v as Record<string, unknown>;
        const id = o.id ?? o.value ?? o.name ?? o.label;
        if (id != null && String(id).trim()) return String(id).trim();
      }
      return null;
    };

    const companyCanonicalValues = new Map<string, Set<string>>();
    for (const { formId, formVersionId, fieldName } of categoryFields) {
      const form = await getFormById(formId);
      const version = form?.form_versions?.find((v) => v.id === formVersionId) as FormVersion & { schema?: { fields?: FormField[] } };
      const field = version?.schema?.fields?.find((f) => f.name === fieldName);
      const includeFaculties = field?.masterDegreesIncludeFaculties ?? false;
      const isMultiple = field?.masterDegreesMultiple ?? false;
      const formOpts = buildMasterDegreeOptionsForForm(masters, faculties, includeFaculties);

      const versions = await listFormVersionsForServer(formId);
      const versionIds = versions.map((v) => v.id);
      if (versionIds.length === 0) continue;
      const responses = await prisma.formResponse.findMany({
        where: {
          form_version_id: { in: nums(versionIds) },
          company_id: { not: null },
          ...NOT_ARCHIVED,
        },
        select: { id: true, company_id: true, data: true },
        orderBy: { submitted_at: "desc" },
      }) as unknown as Array<{ company_id: string | { id: string }; data: Record<string, unknown> }>;
      const latestByCompany = new Map<string, Record<string, unknown>>();
      for (const r of responses) {
        const companyId = typeof r.company_id === "string" ? r.company_id : r.company_id?.id;
        if (!companyId || latestByCompany.has(companyId)) continue;
        latestByCompany.set(companyId, r.data ?? {});
      }
      for (const [companyId, data] of latestByCompany) {
        const fieldValue = data[fieldName];
        if (fieldValue == null) continue;
        const items = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
        const values = items.map(extractVal).filter((s): s is string => !!s);
        const normalized = normalizeMasterDegreesValues(values, formOpts, isMultiple, { masters, faculties });
        const set = companyCanonicalValues.get(companyId) ?? new Set<string>();
        for (const v of normalized) set.add(v);
        companyCanonicalValues.set(companyId, set);
      }
    }

    const selectedSet = new Set(selectedValues.map((v) => v.trim()).filter(Boolean));
    const result: string[] = [];
    for (const [companyId, canonValues] of companyCanonicalValues) {
      const hasAll = [...selectedSet].every((sel) => canonValues.has(sel));
      if (hasAll) result.push(companyId);
    }
    console.log("[floorplan-category] getCompanyIdsMatchingFloorplanCategory", {
      selectedValues: selectedValues.length,
      categoryFieldsCount: categoryFields.length,
      matchingCompanyCount: result.length,
    });
    return result;
  } catch (error) {
    console.error("[getCompanyIdsMatchingFloorplanCategory] Error:", error);
    return [];
  }
}

/** Get company categories (interested study fields) from form responses. Returns Map<companyId, string[]> of display labels for matching. */
export async function getCompanyCategoriesFromFormResponses(
  categoryFields: Array<{ formId: string; formVersionId: string; fieldName: string }>
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (categoryFields.length === 0) return result;
  try {
    const { listMasters, listFaculties } = await import("@/lib/repos/features");
    const { normalizeFaculties, resolveMasterDegreeValueToDisplayLabel } = await import("@/lib/utils/master-degree-options");

    const masters = (await listMasters({ limit: 300, sort: "name" })) ?? [];
    const rawFaculties = (await listFaculties({ limit: 100, sort: "name" })) ?? [];
    const faculties = normalizeFaculties(rawFaculties);

    const extractVal = (v: unknown): string | null => {
      if (v == null) return null;
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "object" && v !== null) {
        const o = v as Record<string, unknown>;
        const id = o.id ?? o.value ?? o.name ?? o.label;
        if (id != null && String(id).trim()) return String(id).trim();
      }
      return null;
    };

    for (const { formId, formVersionId, fieldName } of categoryFields) {
      const versions = await listFormVersionsForServer(formId);
      const versionIds = versions.map((v) => v.id);
      if (versionIds.length === 0) continue;
      const responses = await prisma.formResponse.findMany({
        where: {
          form_version_id: { in: nums(versionIds) },
          company_id: { not: null },
          ...NOT_ARCHIVED,
        },
        select: { id: true, company_id: true, data: true },
        orderBy: { submitted_at: "desc" },
      }) as unknown as Array<{ company_id: string | { id: string }; data: Record<string, unknown> }>;
      const latestByCompany = new Map<string, Record<string, unknown>>();
      for (const r of responses) {
        const companyId = typeof r.company_id === "string" ? r.company_id : r.company_id?.id;
        if (!companyId || latestByCompany.has(companyId)) continue;
        latestByCompany.set(companyId, r.data ?? {});
      }
      for (const [companyId, data] of latestByCompany) {
        const fieldValue = data[fieldName];
        if (fieldValue == null) continue;
        const items = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
        const labels = items
          .map((v) => {
            const s = extractVal(v);
            if (!s) return null;
            return resolveMasterDegreeValueToDisplayLabel(s, masters, faculties) || s;
          })
          .filter((x): x is string => !!x);
        const existing = result.get(companyId) ?? [];
        result.set(companyId, [...new Set([...existing, ...labels])]);
      }
    }
    return result;
  } catch (error) {
    console.error("[getCompanyCategoriesFromFormResponses] Error:", error);
    return result;
  }
}

/** Get company's master/faculty logos from master-degrees form responses. Returns unique logo IDs only. */
export async function getCompanyMasterDegreesFromForm(
  categoryFields: Array<{ formId: string; formVersionId: string; fieldName: string }>,
  companyId: string
): Promise<string[]> {
  try {
    const { listMasters, listFaculties } = await import("@/lib/repos/features");
    const { resolveLogosForValue, extractLogoId, normalizeFaculties } = await import("@/lib/utils/master-degree-options");

    const { groups } = await getFloorplanCategoryOptions(categoryFields);
    const opts = groups.flatMap((g) => g.options);
    const masters = (await listMasters({ limit: 300, sort: "name" })) ?? [];
    const rawFaculties = (await listFaculties({ limit: 100, sort: "name" })) ?? [];
    const faculties = normalizeFaculties(rawFaculties);


    const valuesSeen = new Set<string>();
    const orderedValues: string[] = [];
    for (const { formId, fieldName } of categoryFields) {
      const versions = await listFormVersionsForServer(formId);
      const versionIds = versions.map((v) => v.id);
      if (versionIds.length === 0) continue;
      const responses = await prisma.formResponse.findMany({
        where: {
          form_version_id: { in: nums(versionIds) },
          company_id: companyId,
          ...NOT_ARCHIVED,
        },
        select: { id: true, company_id: true, data: true },
        orderBy: { submitted_at: "desc" },
        take: 1,
      }) as unknown as Array<{ data: Record<string, unknown> }>;
      const data = responses?.[0]?.data ?? {};
      const fieldValue = data[fieldName];
      const extractVal = (v: unknown): string | null => {
        if (v == null) return null;
        if (typeof v === "string" && v.trim()) return v.trim();
        if (typeof v === "object" && v !== null) {
          const o = v as Record<string, unknown>;
          const id = o.id ?? o.value ?? o.name ?? o.label;
          if (id != null && String(id).trim()) return String(id).trim();
        }
        return null;
      };
      if (Array.isArray(fieldValue)) {
        for (const v of fieldValue) {
          const s = extractVal(v);
          if (s && !valuesSeen.has(s)) {
            valuesSeen.add(s);
            orderedValues.push(s);
          }
        }
      } else {
        const s = extractVal(fieldValue);
        if (s && !valuesSeen.has(s)) {
          valuesSeen.add(s);
          orderedValues.push(s);
        }
      }
    }

    type LogoSource = "master" | "faculty" | "other";
    const logoSourceOrder: Record<LogoSource, number> = { master: 0, faculty: 1, other: 2 };
    const getSourceFromValue = (v: string): LogoSource => {
      const facMaster = v.match(/^fac:([^:]+):([^:]+)$/);
      if (facMaster) return "master";
      const facOnly = v.match(/^fac:([^:]+)$/);
      if (facOnly) {
        const f = faculties?.find((x) => x.id === facOnly[1]);
        if (!f) return "faculty";
        if (/^others?$/i.test((f.name ?? "").trim())) return "other";
        const hasMasters = (f.masters ?? []).length > 0;
        return hasMasters ? "master" : "faculty";
      }
      return "master";
    };
    const getSourceFromOptValue = (optValue: string): LogoSource => {
      if (optValue.match(/^fac:[^:]+:[^:]+$/)) return "master";
      const facOnly = optValue.match(/^fac:([^:]+)$/);
      if (facOnly) {
        const f = faculties?.find((x) => x.id === facOnly[1]);
        if (f && /^others?$/i.test((f.name ?? "").trim())) return "other";
        return "faculty";
      }
      return "master";
    };

    // Phase 1: Load all logos (with source) from values
    const logoEntries: Array<{ logoId: string; source: LogoSource }> = [];
    const seen = new Set<string>();
    for (const val of orderedValues) {
      const masterNameFromLabel = val.includes(" - ") ? val.split(" - ").pop()?.trim() : null;
      const matchingOpts = opts.filter((o) =>
        o.value === val || o.label === val ||
        (masterNameFromLabel && (o.label === masterNameFromLabel || normalizeForMatch(o.label) === normalizeForMatch(masterNameFromLabel))) ||
        normalizeForMatch(o.value) === normalizeForMatch(val) ||
        normalizeForMatch(o.label) === normalizeForMatch(val) ||
        valueMatchesOption(val, o.value) ||
        (o.value.match(/^fac:[^:]+:([^:]+)$/)?.[1] === val.trim())
      );
      if (matchingOpts.length > 0) {
        for (const opt of matchingOpts) {
          const facOnly = opt.value.match(/^fac:([^:]+)$/);
          if (facOnly) {
            const f = faculties?.find((x) => x.id === facOnly[1]);
            if (f && (f.masters ?? []).length > 0) continue;
          }
          let logo = extractLogoId(opt.logo);
          if (!logo && opt.value.match(/^fac:[^:]+:([^:]+)$/)) {
            const masterId = opt.value.split(":")[2];
            const m = masters.find((x) => x.id === masterId);
            logo = extractLogoId(m?.logo);
          }
          if (!logo && /^[0-9a-f-]{36}$/i.test(opt.value)) {
            const m = masters.find((x) => x.id === opt.value);
            logo = extractLogoId(m?.logo);
          }
          if (logo && !seen.has(logo)) {
            seen.add(logo);
            logoEntries.push({ logoId: logo, source: getSourceFromOptValue(opt.value) });
          }
        }
      } else {
        const resolved = resolveLogosForValue(val, masters, faculties);
        const source = getSourceFromValue(val);
        for (const logo of resolved) {
          if (logo && !seen.has(logo)) {
            seen.add(logo);
            logoEntries.push({ logoId: logo, source });
          }
        }
      }
    }

    // Phase 2: Sort by source (masters → faculties → other, left to right)
    logoEntries.sort((a, b) => logoSourceOrder[a.source] - logoSourceOrder[b.source]);
    return logoEntries.map((e) => e.logoId);
  } catch (error) {
    console.error("[getCompanyMasterDegreesFromForm] Error:", error);
    return [];
  }
}

/** Batch version: get master/faculty logos for multiple companies at once. Returns Record<companyId, string[]>. */
export async function getCompanyMasterDegreesFromFormBatch(
  categoryFields: Array<{ formId: string; formVersionId: string; fieldName: string }>,
  companyIds: string[]
): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};
  if (companyIds.length === 0) return result;
  try {
    const { listMasters, listFaculties } = await import("@/lib/repos/features");
    const { resolveLogosForValue, extractLogoId, normalizeFaculties } = await import("@/lib/utils/master-degree-options");

    const { groups } = await getFloorplanCategoryOptions(categoryFields);
    const opts = groups.flatMap((g) => g.options);
    const masters = (await listMasters({ limit: 300, sort: "name" })) ?? [];
    const rawFaculties = (await listFaculties({ limit: 100, sort: "name" })) ?? [];
    const faculties = normalizeFaculties(rawFaculties);

    type LogoSource = "master" | "faculty" | "other";
    const logoSourceOrder: Record<LogoSource, number> = { master: 0, faculty: 1, other: 2 };
    const getSourceFromValue = (v: string): LogoSource => {
      const facMaster = v.match(/^fac:([^:]+):([^:]+)$/);
      if (facMaster) return "master";
      const facOnly = v.match(/^fac:([^:]+)$/);
      if (facOnly) {
        const f = faculties?.find((x) => String(x.id) === facOnly[1]);
        if (!f) return "faculty";
        if (/^others?$/i.test((f.name ?? "").trim())) return "other";
        const hasMasters = (f.masters ?? []).length > 0;
        return hasMasters ? "master" : "faculty";
      }
      return "master";
    };
    const getSourceFromOptValue = (optValue: string): LogoSource => {
      if (optValue.match(/^fac:[^:]+:[^:]+$/)) return "master";
      const facOnly = optValue.match(/^fac:([^:]+)$/);
      if (facOnly) {
        const f = faculties?.find((x) => String(x.id) === facOnly[1]);
        if (f && /^others?$/i.test((f.name ?? "").trim())) return "other";
        return "faculty";
      }
      return "master";
    };

    const extractVal = (v: unknown): string | null => {
      if (v == null) return null;
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "object" && v !== null) {
        const o = v as Record<string, unknown>;
        const id = o.id ?? o.value ?? o.name ?? o.label;
        if (id != null && String(id).trim()) return String(id).trim();
      }
      return null;
    };

    const companyDataByFormId = new Map<string, Map<string, Record<string, unknown>>>();
    const formIdsSeen = new Set<string>();
    for (const { formId } of categoryFields) {
      if (formIdsSeen.has(formId)) continue;
      formIdsSeen.add(formId);
      const versions = await listFormVersionsForServer(formId);
      const versionIds = versions.map((v) => v.id);
      if (versionIds.length === 0) continue;
      const responses = await prisma.formResponse.findMany({
        where: {
          form_version_id: { in: nums(versionIds) },
          company_id: { in: companyIds },
          ...NOT_ARCHIVED,
        },
        select: { id: true, company_id: true, data: true },
        orderBy: { submitted_at: "desc" },
      }) as unknown as Array<{ company_id: string | { id: string }; data: Record<string, unknown> }>;
      const byCompany = new Map<string, Record<string, unknown>>();
      companyDataByFormId.set(formId, byCompany);
      for (const r of responses) {
        const companyId = typeof r.company_id === "string" ? r.company_id : r.company_id?.id;
        if (!companyId || byCompany.has(companyId)) continue;
        byCompany.set(companyId, r.data ?? {});
      }
    }

    for (const companyId of companyIds) {
      const valuesSeen = new Set<string>();
      const orderedValues: string[] = [];
      for (const { formId, fieldName } of categoryFields) {
        const byCompany = companyDataByFormId.get(formId);
        const data = byCompany?.get(companyId) ?? {};
        const fieldValue = data[fieldName];
        if (Array.isArray(fieldValue)) {
          for (const v of fieldValue) {
            const s = extractVal(v);
            if (s && !valuesSeen.has(s)) {
              valuesSeen.add(s);
              orderedValues.push(s);
            }
          }
        } else {
          const s = extractVal(fieldValue);
          if (s && !valuesSeen.has(s)) {
            valuesSeen.add(s);
            orderedValues.push(s);
          }
        }
      }

      const logoEntries: Array<{ logoId: string; source: LogoSource }> = [];
      const seen = new Set<string>();
      for (const val of orderedValues) {
        const masterNameFromLabel = val.includes(" - ") ? val.split(" - ").pop()?.trim() : null;
        const matchingOpts = opts.filter((o) =>
          o.value === val || o.label === val ||
          (masterNameFromLabel && (o.label === masterNameFromLabel || normalizeForMatch(o.label) === normalizeForMatch(masterNameFromLabel))) ||
          normalizeForMatch(o.value) === normalizeForMatch(val) ||
          normalizeForMatch(o.label) === normalizeForMatch(val) ||
          valueMatchesOption(val, o.value) ||
          (o.value.match(/^fac:[^:]+:([^:]+)$/)?.[1] === val.trim())
        );
        if (matchingOpts.length > 0) {
          for (const opt of matchingOpts) {
            const facOnly = opt.value.match(/^fac:([^:]+)$/);
            if (facOnly) {
              const f = faculties?.find((x) => String(x.id) === facOnly[1]);
              if (f && (f.masters ?? []).length > 0) continue;
            }
            let logo = extractLogoId(opt.logo);
            if (!logo && opt.value.match(/^fac:[^:]+:([^:]+)$/)) {
              const masterId = opt.value.split(":")[2];
              const m = masters.find((x) => String(x.id) === masterId);
              logo = extractLogoId(m?.logo);
            }
            if (!logo && /^[0-9a-f-]{36}$/i.test(opt.value)) {
              const m = masters.find((x) => String(x.id) === opt.value);
              logo = extractLogoId(m?.logo);
            }
            if (logo && !seen.has(logo)) {
              seen.add(logo);
              logoEntries.push({ logoId: logo, source: getSourceFromOptValue(opt.value) });
            }
          }
        } else {
          const resolved = resolveLogosForValue(val, masters, faculties);
          const source = getSourceFromValue(val);
          for (const logo of resolved) {
            if (logo && !seen.has(logo)) {
              seen.add(logo);
              logoEntries.push({ logoId: logo, source });
            }
          }
        }
      }
      logoEntries.sort((a, b) => logoSourceOrder[a.source] - logoSourceOrder[b.source]);
      result[companyId] = logoEntries.map((e) => e.logoId);
    }
    return result;
  } catch (error) {
    console.error("[getCompanyMasterDegreesFromFormBatch] Error:", error);
    return {};
  }
}

export async function getCompanyFormBySlugAndEvent(eventId: string, slug: string) {
  try {
    // Get form by slug
    const forms = (
      await prisma.form.findMany({
        where: { slug, is_active: true },
        include: FORM_INCLUDE,
        take: 1,
      })
    ).map((r) => shapeForm(r)!) as Form[];

    if (forms.length === 0) return null;

    const form = forms[0];
    // Find version that matches this event (prefer active version if it matches)
    const versions = form.form_versions || [];
    const eventMatchingVersions = versions.filter((v) => {
      const meta = (v as FormVersion & { metadata?: FormMetadata })?.metadata;
      return meta?.is_company_form && String(meta.event_id) === String(eventId);
    });
    const activeVersion = eventMatchingVersions.find((v) => v.is_active) ?? eventMatchingVersions[0];
    if (!activeVersion) return null;

    const metadata = (activeVersion as FormVersion & { metadata?: FormMetadata })?.metadata;
    if (!metadata?.is_company_form) return null;
    if (metadata.event_id !== eventId) return null;

    if (String(metadata.event_id) !== String(eventId)) return null;

    return {
      id: form.id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      metadata,
      activeVersion: {
        id: activeVersion.id,
        version_number: activeVersion.version_number,
        schema: activeVersion.schema,
      },
    };
  } catch (error) {
    console.error("[getCompanyFormBySlugAndEvent] Error fetching company form:", error);
    return null;
  }
}

export async function checkCompanyFormCompletion(companyId: string, formVersionIds: string[]) {
  try {
    // Use server client to ensure we have permissions to read company_id field

    if (formVersionIds.length === 0) return new Set<string>();

    const responses = await prisma.formResponse.findMany({
      where: {
        company_id: companyId,
        form_version_id: { in: nums(formVersionIds) },
      },
      select: { form_version_id: true, company_id: true },
    }) as unknown as Array<{ form_version_id: string; company_id: string }>;

    // Return set of completed form version IDs
    return new Set(responses.map((r) => r.form_version_id));
  } catch (error) {
    console.error("[checkCompanyFormCompletion] Error checking form completion:", error);
    return new Set<string>();
  }
}

/** Batch check form completion for multiple companies. Returns Map<companyId, Set<formVersionId>> */
export async function checkCompanyFormCompletionBatch(
  companyIds: string[],
  formVersionIds: string[]
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  companyIds.forEach((id) => result.set(id, new Set()));
  if (companyIds.length === 0 || formVersionIds.length === 0) return result;
  try {
    const responses = await prisma.formResponse.findMany({
      where: {
        company_id: { in: companyIds },
        form_version_id: { in: nums(formVersionIds) },
      },
      select: { form_version_id: true, company_id: true },
    }) as unknown as Array<{ form_version_id: string; company_id: string }>;
    for (const r of responses) {
      const set = result.get(r.company_id);
      if (set) set.add(r.form_version_id);
    }
    return result;
  } catch (error) {
    console.error("[checkCompanyFormCompletionBatch] Error:", error);
    return result;
  }
}

export async function checkCompanyFormCompletionByFormIds(companyId: string, formIds: string[]) {
  try {
    // Use server client to ensure we have permissions to read company_id field

    if (formIds.length === 0) return new Set<string>();


    // First, get all form version IDs for these forms
    const formVersions = await prisma.formVersion.findMany({
      where: { form_id: { in: nums(formIds) } },
      select: { id: true, form_id: true },
    }) as unknown as Array<{ id: string; form_id: string }>;

    if (formVersions.length === 0) return new Set<string>();

    const formVersionIds = formVersions.map((fv) => fv.id);

    // Check for responses across all versions of these forms
    const responses = await prisma.formResponse.findMany({
      where: {
        company_id: companyId,
        form_version_id: { in: nums(formVersionIds) },
      },
      select: { form_version_id: true, company_id: true },
    }) as unknown as Array<{ form_version_id: string; company_id: string }>;

    // Map form version IDs back to form IDs
    const formVersionToFormId = new Map(formVersions.map((fv) => [fv.id, fv.form_id]));
    const completedFormIds = new Set<string>();

    responses.forEach((r) => {
      const formId = formVersionToFormId.get(r.form_version_id);
      if (formId) {
        completedFormIds.add(formId);
      }
    });

    return completedFormIds;
  } catch (error) {
    console.error("[checkCompanyFormCompletionByFormIds] Error checking form completion:", error);
    return new Set<string>();
  }
}

/** Batch check: has company completed ANY version of these forms? Returns Map<companyId, Set<formId>> */
export async function checkCompanyFormCompletionByFormIdsBatch(
  companyIds: string[],
  formIds: string[]
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  companyIds.forEach((id) => result.set(id, new Set()));
  if (companyIds.length === 0 || formIds.length === 0) return result;
  try {
    const formVersions = await prisma.formVersion.findMany({
      where: { form_id: { in: nums(formIds) } },
      select: { id: true, form_id: true },
    }) as unknown as Array<{ id: string; form_id: string }>;
    if (formVersions.length === 0) return result;
    const formVersionIds = formVersions.map((fv) => fv.id);
    const formVersionToFormId = new Map(formVersions.map((fv) => [fv.id, fv.form_id]));
    const responses = await prisma.formResponse.findMany({
      where: {
        company_id: { in: companyIds },
        form_version_id: { in: nums(formVersionIds) },
      },
      select: { form_version_id: true, company_id: true },
    }) as unknown as Array<{ form_version_id: string; company_id: string }>;
    for (const r of responses) {
      const formId = formVersionToFormId.get(r.form_version_id);
      const set = result.get(r.company_id);
      if (formId && set) set.add(formId);
    }
    return result;
  } catch (error) {
    console.error("[checkCompanyFormCompletionByFormIdsBatch] Error:", error);
    return result;
  }
}

/** Batch check form completion with compulsory support.
 * For compulsory forms: company must have completed this version OR any newer version (version_number >= compulsory).
 * Earlier (lower) versions do not count.
 * For non-compulsory forms: any version counts as complete.
 * Returns Map<companyId, Set<formId>> */
export async function checkCompanyFormCompletionBatchWithCompulsory(
  companyIds: string[],
  forms: Array<{ formId: string; formVersionId: string; versionNumber?: number; isCompulsory?: boolean }>
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  companyIds.forEach((id) => result.set(id, new Set()));
  if (companyIds.length === 0 || forms.length === 0) return result;

  const compulsoryForms = forms.filter((f) => f.isCompulsory && f.versionNumber != null);
  const nonCompulsoryForms = forms.filter((f) => !f.isCompulsory);

  try {
    // For compulsory forms: this version OR any newer version (version_number >= compulsory) counts
    if (compulsoryForms.length > 0) {
          for (const form of compulsoryForms) {
        const formVersions = (await prisma.formVersion.findMany({
          where: {
            form_id: Number(form.formId),
            version_number: { gte: form.versionNumber! },
          },
          select: { id: true },
        })) as unknown as Array<{ id: string }>;
        const versionIds = formVersions.map((v) => v.id);
        if (versionIds.length === 0) continue;
        const batch = await checkCompanyFormCompletionBatch(companyIds, versionIds);
        for (const [companyId, completedVersionIds] of batch) {
          const set = result.get(companyId);
          if (set && completedVersionIds.size > 0) set.add(form.formId);
        }
      }
    }

    // For non-compulsory forms: any version counts
    if (nonCompulsoryForms.length > 0) {
      const nonCompulsoryFormIds = nonCompulsoryForms.map((f) => f.formId);
      const nonCompulsoryBatch = await checkCompanyFormCompletionByFormIdsBatch(companyIds, nonCompulsoryFormIds);
      for (const [companyId, formIds] of nonCompulsoryBatch) {
        const set = result.get(companyId);
        if (set) {
          for (const fid of formIds) set.add(fid);
        }
      }
    }

    return result;
  } catch (error) {
    console.error("[checkCompanyFormCompletionBatchWithCompulsory] Error:", error);
    return result;
  }
}

export async function getLatestCompanyFormResponse(formVersionId: string, companyId: string) {
  try {
    // Use server client to ensure we can always read company-linked responses

    // Get the most recent response for this specific form version and company
    // Sort by submitted_at descending to ensure we get the latest submission
    const responses = (await prisma.formResponse.findMany({
      where: { form_version_id: Number(formVersionId), company_id: companyId },
      orderBy: { submitted_at: "desc" }, // Most recent first
      take: 1,
    })) as unknown as FormResponse[];

    return responses[0] ?? null;
  } catch (error) {
    console.error("[getLatestCompanyFormResponse] Error fetching latest company form response:", error);
    return null;
  }
}

export async function getLatestCompanyFormResponseForForm(formId: string, companyId: string) {
  try {

    // Get the most recent response across ALL versions of this form for this company
    // Sort by submitted_at descending to ensure we get the latest submission regardless of version
    const responses = (await prisma.formResponse.findMany({
      where: { company_id: companyId, formVersion: { form_id: Number(formId) } },
      orderBy: { submitted_at: "desc" }, // Most recent first
      take: 1,
    })) as unknown as FormResponse[];

    return responses[0] ?? null;
  } catch (error) {
    console.error("[getLatestCompanyFormResponseForForm] Error fetching latest company form response for form:", error);
    return null;
  }
}



