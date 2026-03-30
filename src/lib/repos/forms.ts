// lib/repos/forms.ts
"use server";

import { readItems, createItem, updateItem, deleteItem, readItem } from "@directus/sdk";
import { getAuthedDirectusOrThrow, directus } from "@/lib/directus";
import type { Form, FormVersion, FormResponse, FormSchema, FormMetadata, FormField } from "@/lib/schema";

// ===================== FORMS =====================

export async function listForms(opts?: {
  search?: string;
  limit?: number;
  page?: number;
  sort?: string;
}) {
  try {
    const client = await getAuthedDirectusOrThrow();
    const { search, limit = 25, page = 1, sort = "-created_at" } = opts ?? {};

    const result = await client.request(
      readItems("forms" as any, {
        fields: ["*", { form_versions: ["*"] } as any],
        limit,
        page,
        sort: sort as any,
        ...(search ? { search } : {}),
      })
    ) as unknown as Form[];

    return result;
  } catch (error) {
    console.error("[listForms] Error listing forms:", error);
    throw error;
  }
}

export async function getFormById(id: string) {
  try {
    // Try authenticated first, fall back to public client for public form access
    let client;
    try {
      client = await getAuthedDirectusOrThrow();
    } catch {
      // If auth fails, use public client for public form submissions
      client = directus;
    }

    return client.request(
      readItem("forms" as any, id, {
        fields: ["*", { form_versions: ["*"] } as any],
      })
    ) as unknown as Form;
  } catch (error) {
    console.error("Error getting form by id:", error);
    throw error;
  }
}

export async function getFormBySlug(slug: string) {
  try {
    // Try authenticated first, fall back to public client
    let client;
    try {
      client = await getAuthedDirectusOrThrow();
    } catch {
      // If auth fails, use public client for public forms
      client = directus;
    }

    const forms = await client.request(
      readItems("forms" as any, {
        fields: ["*", { form_versions: ["*"] } as any],
        filter: { slug: { _eq: slug } },
        limit: 1,
      })
    ) as unknown as Form[];

    return forms?.[0] ?? null;
  } catch (error) {
    console.error("[getFormBySlug] Error getting form by slug:", error);
    throw error;
  }
}

export async function getPublicFormBySlug(slug: string) {
  try {
    // Always use public client for public form access
    const forms = await directus.request(
      readItems("forms" as any, {
        fields: ["*", { form_versions: ["*"] } as any],
        filter: { slug: { _eq: slug } },
        limit: 1,
      })
    ) as unknown as Form[];

    return forms?.[0] ?? null;
  } catch (error) {
    console.error("[getPublicFormBySlug] Error getting public form by slug:", error);
    throw error;
  }
}

export async function createForm(data: Partial<Form> & { metadata?: unknown }) {
  try {
    const client = await getAuthedDirectusOrThrow();
    // Remove metadata from form creation - it goes on form_version instead
    const { metadata, ...formData } = data;
    const created = await client.request(
      createItem("forms" as any, formData)
    ) as unknown as Form;

    // Refetch to get all fields
    const result = await client.request(
      readItem("forms" as any, created.id, {
        fields: ["*", { form_versions: ["*"] } as any],
      })
    ) as unknown as Form;

    return result;
  } catch (error) {
    console.error("Error creating form:", error);
    throw error;
  }
}

export async function updateForm(id: string, data: Partial<Form>) {
  try {
    const client = await getAuthedDirectusOrThrow();
    await client.request(
      updateItem("forms" as any, id, data)
    );

    // Refetch to get updated data with all fields
    const updated = await client.request(
      readItem("forms" as any, id, {
        fields: ["*", { form_versions: ["*"] } as any],
      })
    ) as unknown as Form;

    return updated;
  } catch (error) {
    console.error("Error updating form:", error);
    throw error;
  }
}

export async function deleteForm(id: string) {
  try {
    const client = await getAuthedDirectusOrThrow();

    // Get all versions for this form
    const versions = await listFormVersions(id);
    const versionIds = versions.map(v => v.id);

    // Delete all responses for all versions of this form
    if (versionIds.length > 0) {
      // Get all responses for all versions
      const allResponses = await client.request(
        readItems("form_responses" as any, {
          fields: ["id"],
          filter: { form_version_id: { _in: versionIds } },
          limit: -1, // Get all responses
        })
      ) as unknown as FormResponse[];

      // Delete each response
      for (const response of allResponses) {
        await client.request(deleteItem("form_responses" as any, response.id));
      }
    }

    // Delete all versions
    for (const versionId of versionIds) {
      await client.request(deleteItem("form_versions" as any, versionId));
    }

    // Finally, delete the form itself
    await client.request(deleteItem("forms" as any, id));
    return true;
  } catch (error) {
    console.error("Error deleting form:", error);
    throw error;
  }
}

// ===================== FORM VERSIONS =====================

export async function listFormVersions(formId: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
    return client.request(
      readItems("form_versions" as any, {
        fields: ["*"],
        filter: { form_id: { _eq: formId } },
        sort: "-version_number",
      })
    ) as unknown as FormVersion[];
  } catch (error) {
    console.error("Error listing form versions:", error);
    throw error;
  }
}

/** List form versions using server client (for student/prerequisite flow). */
export async function listFormVersionsForServer(formId: string): Promise<FormVersion[]> {
  try {
    const { getServerDirectusClientPreferStatic } = await import("@/lib/directus");
    const client = await getServerDirectusClientPreferStatic();
    return client.request(
      readItems("form_versions" as any, {
        fields: ["*"],
        filter: { form_id: { _eq: formId } },
        sort: "-version_number",
      })
    ) as unknown as FormVersion[];
  } catch (error) {
    console.error("[listFormVersionsForServer] Error:", error);
    return [];
  }
}

export async function getFormVersionById(id: string) {
  try {
    // Try authenticated first, fall back to public client for public form access
    let client;
    try {
      client = await getAuthedDirectusOrThrow();
    } catch {
      // If auth fails, use public client for public form submissions
      client = directus;
    }

    return client.request(
      readItem("form_versions" as any, id, {
        fields: ["*", { form_id: ["*"] } as any],
      })
    ) as unknown as FormVersion;
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
    const client = await getAuthedDirectusOrThrow();

    // If this version should be active, deactivate all other versions first
    if (data.is_active) {
      const existingVersions = await listFormVersions(data.form_id);
      for (const version of existingVersions) {
        if (version.is_active) {
          await client.request(
            updateItem("form_versions" as any, version.id, { is_active: false })
          );
        }
      }
    }

    return client.request(
      createItem("form_versions" as any, data)
    ) as unknown as FormVersion;
  } catch (error) {
    console.error("Error creating form version:", error);
    throw error;
  }
}

export async function updateFormVersion(id: string, data: Partial<FormVersion>) {
  try {
    const client = await getAuthedDirectusOrThrow();

    // If activating this version, deactivate others
    if (data.is_active) {
      const version = await getFormVersionById(id);
      const formId = typeof version.form_id === "string" ? version.form_id : version.form_id.id;

      const existingVersions = await listFormVersions(formId);

      for (const v of existingVersions) {
        if (v.id !== id && v.is_active) {
          await client.request(
            updateItem("form_versions" as any, v.id, { is_active: false })
          );
        }
      }
    }

    const result = await client.request(
      updateItem("form_versions" as any, id, data)
    ) as unknown as FormVersion;
    return result;
  } catch (error) {
    console.error("[updateFormVersion] Error updating form version:", error);
    throw error;
  }
}

export async function deleteFormVersion(id: string) {
  try {
    const client = await getAuthedDirectusOrThrow();

    // Get all responses for this version
    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["id"],
        filter: { form_version_id: { _eq: id } },
        limit: -1, // Get all responses
      })
    ) as unknown as FormResponse[];

    // Delete all responses for this version
    for (const response of responses) {
      await client.request(deleteItem("form_responses" as any, response.id));
    }

    // Delete the version itself
    await client.request(deleteItem("form_versions" as any, id));
    return true;
  } catch (error) {
    console.error("Error deleting form version:", error);
    throw error;
  }
}

export async function getActiveFormVersion(formId: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
    const versions = await client.request(
      readItems("form_versions" as any, {
        fields: ["*"],
        filter: {
          form_id: { _eq: formId },
          is_active: { _eq: true },
        },
        limit: 1,
      })
    ) as unknown as FormVersion[];

    return versions?.[0] ?? null;
  } catch (error) {
    console.error("Error getting active form version:", error);
    throw error;
  }
}

/** Get active form version using server client (for student/prerequisite flow). */
export async function getActiveFormVersionForServer(formId: string): Promise<FormVersion | null> {
  try {
    const { getServerDirectusClient } = await import("@/lib/directus");
    const client = await getServerDirectusClient();
    const versions = await client.request(
      readItems("form_versions" as any, {
        fields: ["*"],
        filter: { form_id: { _eq: formId }, is_active: { _eq: true } },
        limit: 1,
      })
    ) as unknown as FormVersion[];
    return versions?.[0] ?? null;
  } catch (error) {
    console.error("[getActiveFormVersionForServer] Error:", error);
    return null;
  }
}

// ===================== FORM RESPONSES =====================

/** Filter to exclude archived responses (for student form deduplication). */
const NOT_ARCHIVED_FILTER = {
  _or: [
    { archived: { _null: true } },
    { archived: { _eq: false } },
  ],
};

/** Archive all previous form responses from this student for the given form. Call before creating a new response. */
export async function archivePreviousStudentResponsesForForm(
  studentId: string,
  formId: string
): Promise<void> {
  try {
    const { getServerDirectusClient } = await import("@/lib/directus");
    const client = await getServerDirectusClient();
    const versions = await listFormVersionsForServer(formId);
    const versionIds = versions.map((v) => v.id);
    if (versionIds.length === 0) return;

    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["id", "data"],
        filter: { form_version_id: { _in: versionIds } },
        limit: -1,
      })
    ) as unknown as Array<{ id: string; data?: Record<string, unknown> }>;

    const { updateItem } = await import("@directus/sdk");
    for (const r of responses) {
      if ((r.data as Record<string, unknown>)?._student_id === studentId) {
        await client.request(updateItem("form_responses" as any, r.id, { archived: true }));
      }
    }
  } catch (error) {
    console.error("[archivePreviousStudentResponsesForForm] Error:", error);
    // Non-fatal: continue with submission
  }
}

/** Archive all previous form responses from this company for the given form. Call before creating a new response. */
export async function archivePreviousCompanyResponsesForForm(
  companyId: string,
  formId: string
): Promise<void> {
  try {
    const { getServerDirectusClient } = await import("@/lib/directus");
    const client = await getServerDirectusClient();
    const versions = await listFormVersionsForServer(formId);
    const versionIds = versions.map((v) => v.id);
    if (versionIds.length === 0) return;

    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["id", "company_id"],
        filter: {
          _and: [
            { form_version_id: { _in: versionIds } },
            { company_id: { _eq: companyId } },
          ],
        },
        limit: -1,
      })
    ) as unknown as Array<{ id: string; company_id?: string | { id: string } }>;

    const { updateItem } = await import("@directus/sdk");
    for (const r of responses) {
      await client.request(updateItem("form_responses" as any, r.id, { archived: true }));
    }
  } catch (error) {
    console.error("[archivePreviousCompanyResponsesForForm] Error:", error);
    // Non-fatal: continue with submission
  }
}

/** Archive duplicate student/company responses for a form, keeping only the most recent per student or company. Returns count archived. */
export async function archiveDuplicateResponsesForForm(formId: string): Promise<{ archived: number }> {
  try {
    const client = await getAuthedDirectusOrThrow();
    const versions = await listFormVersions(formId);
    const versionIds = versions.map((v) => v.id);
    if (versionIds.length === 0) return { archived: 0 };

    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["id", "data", "company_id", "submitted_at"],
        filter: { _and: [{ form_version_id: { _in: versionIds } }, NOT_ARCHIVED_FILTER] },
        limit: -1,
        sort: "-submitted_at",
      })
    ) as unknown as Array<{ id: string; data?: Record<string, unknown>; company_id?: string | { id: string }; submitted_at: string }>;

    // Group by dedupe key: company_id for company forms, _student_id for student forms
    const byKey = new Map<string, typeof responses>();
    for (const r of responses) {
      const companyId = typeof r.company_id === "string" ? r.company_id : r.company_id?.id;
      const studentId = (r.data as Record<string, unknown>)?._student_id as string | undefined;
      const key = companyId ? `company:${companyId}` : studentId ? `student:${studentId}` : undefined;
      if (key) {
        const list = byKey.get(key) ?? [];
        list.push(r);
        byKey.set(key, list);
      }
    }

    const { updateItem } = await import("@directus/sdk");
    let archived = 0;
    for (const [, list] of byKey) {
      if (list.length <= 1) continue;
      // Keep first (most recent by sort), archive the rest
      const toArchive = list.slice(1);
      for (const r of toArchive) {
        await client.request(updateItem("form_responses" as any, r.id, { archived: true }));
        archived++;
      }
    }
    return { archived };
  } catch (error) {
    console.error("[archiveDuplicateResponsesForForm] Error:", error);
    throw error;
  }
}

export async function listFormResponses(formVersionId: string, opts?: {
  limit?: number;
  page?: number;
}) {
  try {
    const client = await getAuthedDirectusOrThrow();
    const { limit = 25, page = 1 } = opts ?? {};

    const result = await client.request(
      readItems("form_responses" as any, {
        fields: ["*", { user_id: ["name", "email"], form_version_id: { form_id: ["name"] }, company_id: ["name", "id"], student_id: ["full_name", "first_name", "last_name", "email"] } as any],
        filter: { _and: [{ form_version_id: { _eq: formVersionId } }, NOT_ARCHIVED_FILTER] },
        limit,
        page,
        sort: "-submitted_at",
      })
    ) as unknown as FormResponse[];

    return result;
  } catch (error) {
    console.error("Error listing form responses:", error);
    throw error;
  }
}

export async function getFormResponsesTotalCount(formVersionId: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["id"],
        filter: { _and: [{ form_version_id: { _eq: formVersionId } }, NOT_ARCHIVED_FILTER] },
        limit: -1, // Get all to count
      })
    ) as unknown as Array<{ id: string }>;

    return responses.length;
  } catch (error) {
    console.error("Error counting form responses:", error);
    return 0;
  }
}

export async function getFirstFormResponse(formVersionId: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["submitted_at"],
        filter: { _and: [{ form_version_id: { _eq: formVersionId } }, NOT_ARCHIVED_FILTER] },
        limit: 1,
        sort: "submitted_at", // Oldest first
      })
    ) as unknown as Array<{ submitted_at: string }>;

    return responses.length > 0 ? responses[0] : null;
  } catch (error) {
    console.error("Error getting first form response:", error);
    return null;
  }
}

export async function getLatestFormResponse(formVersionId: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["submitted_at"],
        filter: { _and: [{ form_version_id: { _eq: formVersionId } }, NOT_ARCHIVED_FILTER] },
        limit: 1,
        sort: "-submitted_at", // Newest first
      })
    ) as unknown as Array<{ submitted_at: string }>;

    return responses.length > 0 ? responses[0] : null;
  } catch (error) {
    console.error("Error getting latest form response:", error);
    return null;
  }
}

/** Batch: get latest form response data for multiple students. Returns Map<studentId, data>.
 * Uses server client. Fetches all responses for form versions once, then groups by data._student_id. */
export async function getStudentFormResponsesBatchForForm(
  formId: string,
  studentIds: string[]
): Promise<Map<string, Record<string, unknown>>> {
  if (studentIds.length === 0) return new Map();
  const idSet = new Set(studentIds.map(String));
  try {
    const { getServerDirectusClient } = await import("@/lib/directus");
    const client = await getServerDirectusClient();
    const versions = await listFormVersionsForServer(formId);
    const versionIds = versions.map((v) => v.id);
    if (versionIds.length === 0) return new Map();
    type FormResponseRow = { id: string; form_version_id: string; data?: Record<string, unknown> };
    let responses: FormResponseRow[];
    try {
      responses = (await client.request(
        readItems("form_responses" as any, {
          fields: ["id", "form_version_id", "data"],
          filter: { _and: [{ form_version_id: { _in: versionIds } }, NOT_ARCHIVED_FILTER] },
          limit: -1,
          sort: "-submitted_at",
        })
      )) as unknown as FormResponseRow[];
    } catch {
      responses = (await client.request(
        readItems("form_responses" as any, {
          fields: ["id", "form_version_id", "data"],
          filter: { _and: [{ form_version_id: { _in: versionIds } }, NOT_ARCHIVED_FILTER] },
          limit: -1,
          sort: "-submitted_at",
        })
      )) as unknown as FormResponseRow[];
    }
    const byStudent = new Map<string, Record<string, unknown>>();
    for (const r of responses) {
      const dataObj = r.data as Record<string, unknown> | undefined;
      const fromData = dataObj?._student_id ?? dataObj?.student_id;
      const sid = fromData != null ? String(fromData) : null;
      if (sid != null && idSet.has(sid) && !byStudent.has(sid)) {
        byStudent.set(sid, r.data ?? {});
      }
    }
    return byStudent;
  } catch (error) {
    console.error("[getStudentFormResponsesBatchForForm] Error:", error);
    return new Map();
  }
}

/** Get a student's latest form response across any of the given form versions. Uses server client.
 * Matches by data._student_id (stored in form data JSON) since form_responses may not have a student_id column.
 * Fetches all responses (limit: -1) so early submitters are not missed when the form has many responses. */
export async function getStudentLatestFormResponseForForm(
  studentId: string,
  versionIds: string[]
): Promise<{ id: string; form_version_id: string; data: Record<string, unknown>; attendant_uuid?: string } | null> {
  if (versionIds.length === 0) return null;
  try {
    const { getServerDirectusClientPreferStatic } = await import("@/lib/directus");
    const client = await getServerDirectusClientPreferStatic();
    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["id", "form_version_id", "data", "attendant_uuid"],
        filter: { _and: [{ form_version_id: { _in: versionIds } }, NOT_ARCHIVED_FILTER] },
        limit: -1,
        sort: "-submitted_at",
      })
    ) as unknown as Array<{ id: string; form_version_id: string; data?: Record<string, unknown>; attendant_uuid?: string }>;
    const match = responses.find(
      (r) => (r.data as Record<string, unknown>)?._student_id === studentId
    );
    return match ? { id: match.id, form_version_id: match.form_version_id, data: match.data ?? {}, attendant_uuid: match.attendant_uuid ?? undefined } : null;
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

/** Get event registration form response data for students. Returns Map<studentId, { data, scanning_columns }>.
 * Uses server client. Fetches from event registration forms linked to the event. */
export async function getStudentFormResponseDataForEvent(
  eventId: string,
  studentIds: string[]
): Promise<Map<string, { data: Record<string, unknown>; scanning_columns?: ScanningColumns }>> {
  if (studentIds.length === 0) return new Map();
  const idSet = new Set(studentIds.map(String));
  try {
    const { getServerDirectusClient } = await import("@/lib/directus");
    const client = await getServerDirectusClient();
    const forms = await client.request(
      readItems("forms" as any, {
        fields: ["id", { form_versions: ["id", "metadata"] } as any],
        limit: -1,
      })
    ) as unknown as Array<{
      id: string;
      form_versions?: Array<{
        id: string;
        metadata?: { is_event_registration?: boolean; event_id?: string; scanning_columns?: ScanningColumns };
      }>;
    }>;

    const versionIds: string[] = [];
    const versionToScanningColumns = new Map<string, ScanningColumns>();
    for (const form of forms) {
      for (const v of form.form_versions ?? []) {
        const meta = v.metadata;
        if (meta?.is_event_registration && String(meta.event_id) === String(eventId)) {
          versionIds.push(v.id);
          if (meta.scanning_columns) versionToScanningColumns.set(v.id, meta.scanning_columns);
        }
      }
    }
    if (versionIds.length === 0) return new Map();

    type Row = { id: string; form_version_id: string; data?: Record<string, unknown>; submitted_at?: string };
    const responses = (await client.request(
      readItems("form_responses" as any, {
        fields: ["id", "form_version_id", "data", "submitted_at"],
        filter: { _and: [{ form_version_id: { _in: versionIds } }, NOT_ARCHIVED_FILTER] },
        limit: -1,
        sort: "-submitted_at",
      })
    )) as unknown as Row[];

    const byStudent = new Map<string, { data: Record<string, unknown>; scanning_columns?: ScanningColumns }>();
    for (const r of responses) {
      const dataObj = r.data as Record<string, unknown> | undefined;
      const fromData = dataObj?._student_id ?? dataObj?.student_id;
      const sid = fromData != null ? String(fromData) : null;
      if (sid != null && idSet.has(sid) && !byStudent.has(sid)) {
        const scanningColumns = versionToScanningColumns.get(r.form_version_id);
        byStudent.set(sid, { data: r.data ?? {}, scanning_columns: scanningColumns });
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
    const client = await getAuthedDirectusOrThrow();
    const { limit = 25, page = 1 } = opts ?? {};

    // First, get all version IDs for this form
    const versions = await listFormVersions(formId);
    const versionIds = versions.map(v => v.id);

    if (versionIds.length === 0) {
      return [];
    }

    const result = await client.request(
      readItems("form_responses" as any, {
        fields: ["*", { user_id: ["name", "email"], form_version_id: { form_id: ["name"], version_number: ["*"] }, company_id: ["name", "id"], student_id: ["full_name", "first_name", "last_name", "email"] } as any],
        filter: { _and: [{ form_version_id: { _in: versionIds } }, NOT_ARCHIVED_FILTER] },
        limit,
        page,
        sort: "-submitted_at",
      })
    ) as unknown as FormResponse[];

    return result;
  } catch (error) {
    console.error("Error listing form responses for all versions:", error);
    throw error;
  }
}

export async function getFormResponsesTotalCountForAllVersions(formId: string) {
  try {
    const client = await getAuthedDirectusOrThrow();

    // First, get all version IDs for this form
    const versions = await listFormVersions(formId);
    const versionIds = versions.map(v => v.id);

    if (versionIds.length === 0) {
      return 0;
    }

    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["id"],
        filter: { _and: [{ form_version_id: { _in: versionIds } }, NOT_ARCHIVED_FILTER] },
        limit: -1, // Get all to count
      })
    ) as unknown as Array<{ id: string }>;

    return responses.length;
  } catch (error) {
    console.error("Error counting form responses for all versions:", error);
    return 0;
  }
}

export async function getFirstFormResponseForAllVersions(formId: string) {
  try {
    const client = await getAuthedDirectusOrThrow();

    // First, get all version IDs for this form
    const versions = await listFormVersions(formId);
    const versionIds = versions.map(v => v.id);

    if (versionIds.length === 0) {
      return null;
    }

    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["submitted_at"],
        filter: { _and: [{ form_version_id: { _in: versionIds } }, NOT_ARCHIVED_FILTER] },
        limit: 1,
        sort: "submitted_at", // Oldest first
      })
    ) as unknown as Array<{ submitted_at: string }>;

    return responses.length > 0 ? responses[0] : null;
  } catch (error) {
    console.error("Error getting first form response for all versions:", error);
    return null;
  }
}

export async function getLatestFormResponseForAllVersions(formId: string) {
  try {
    const client = await getAuthedDirectusOrThrow();

    // First, get all version IDs for this form
    const versions = await listFormVersions(formId);
    const versionIds = versions.map(v => v.id);

    if (versionIds.length === 0) {
      return null;
    }

    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["submitted_at"],
        filter: { _and: [{ form_version_id: { _in: versionIds } }, NOT_ARCHIVED_FILTER] },
        limit: 1,
        sort: "-submitted_at", // Newest first
      })
    ) as unknown as Array<{ submitted_at: string }>;

    return responses.length > 0 ? responses[0] : null;
  } catch (error) {
    console.error("Error getting latest form response for all versions:", error);
    return null;
  }
}

export async function getFormResponseById(id: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
    return client.request(
      readItem("form_responses" as any, id, {
        fields: ["*", { user_id: ["*"], form_version_id: ["*"] } as any],
      })
    ) as unknown as FormResponse;
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
    // Try authenticated first, fall back to public client for anonymous submissions
    let client;
    try {
      client = await getAuthedDirectusOrThrow();
    } catch {
      // If auth fails, use public client for anonymous form submissions
      client = directus;
    }

    return client.request(
      createItem("form_responses" as any, data)
    ) as unknown as FormResponse;
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
    const client = await getAuthedDirectusOrThrow();
    return client.request(
      updateItem("form_responses" as any, id, data)
    ) as unknown as FormResponse;
  } catch (error) {
    console.error("Error updating form response:", error);
    throw error;
  }
}

export async function deleteFormResponse(id: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
    await client.request(deleteItem("form_responses" as any, id));
    return true;
  } catch (error) {
    console.error("Error deleting form response:", error);
    throw error;
  }
}

/** Migrate master-degrees fields in form responses from label format to canonical (fac:facId:masterId). */
export async function migrateFormResponsesMasterDegrees(formId: string): Promise<{ updated: number; total: number }> {
  try {
    const client = await getAuthedDirectusOrThrow();
    const { listMasters, listFaculties } = await import("@/lib/repos/features");
    const { buildMasterDegreeOptionsForForm, normalizeMasterDegreesValues, normalizeFaculties } = await import("@/lib/utils/master-degree-options");

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

    const versionIds = form.form_versions.map((v) => v.id);
    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["id", "form_version_id", "data"],
        filter: { form_version_id: { _in: versionIds } },
        limit: -1,
      })
    ) as unknown as Array<{ id: string; form_version_id: string; data: Record<string, unknown> }>;

    let updated = 0;
    for (const response of responses) {
      const data = { ...(response.data ?? {}) };
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
        await client.request(updateItem("form_responses" as any, response.id, { data }));
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
    const client = await getAuthedDirectusOrThrow();

    // Get all versions for this form
    const versions = await listFormVersions(formId);
    const versionIds = versions.map(v => v.id);

    if (versionIds.length === 0) {
      return 0;
    }

    // Count responses for all versions of this form
    const { readItems } = await import("@directus/sdk");
    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["id"],
        filter: { _and: [{ form_version_id: { _in: versionIds } }, NOT_ARCHIVED_FILTER] },
        limit: -1, // Get all to count
      })
    ) as unknown as FormResponse[];

    return responses.length;
  } catch (error) {
    console.error("Error counting form responses:", error);
    return 0; // Return 0 on error to avoid breaking the UI
  }
}

export async function countFormVersionResponses(formVersionId: string, usePublic = false) {
  try {
    // Use public client if requested, otherwise try authenticated
    let client;
    if (usePublic) {
      const { directus } = await import("@/lib/directus");
      client = directus;
    } else {
      try {
        client = await getAuthedDirectusOrThrow();
      } catch {
        // Fall back to public client if auth fails
        const { directus } = await import("@/lib/directus");
        client = directus;
      }
    }

    // Count responses for a specific form version
    const { readItems } = await import("@directus/sdk");
    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["id"],
        filter: { _and: [{ form_version_id: { _eq: formVersionId } }, NOT_ARCHIVED_FILTER] },
        limit: -1, // Get all to count
      })
    ) as unknown as FormResponse[];

    return responses.length;
  } catch (error) {
    console.error("Error counting form version responses:", error);
    return 0; // Return 0 on error to avoid breaking the UI
  }
}

/**
 * Initialize UUIDs for existing form responses that don't have them.
 * This is useful for migrating forms created before the UUID feature was added.
 * Only processes responses for event registration forms.
 */
export async function initializeAttendantUuids(formId?: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
    const { readItems, updateItem } = await import("@directus/sdk");

    // Get all event registration forms
    const forms = await client.request(
      readItems("forms" as any, {
        fields: ["id", { form_versions: ["id", "metadata"] } as any],
      })
    ) as unknown as Array<{
      id: string;
      form_versions?: Array<{
        id: string;
        metadata?: { is_event_registration?: boolean };
      }>;
    }>;

    // Filter to event registration forms
    const eventRegistrationFormIds = new Set<string>();
    const eventRegistrationVersionIds = new Set<string>();

    for (const form of forms) {
      // If formId is specified, only process that form
      if (formId && form.id !== formId) continue;

      const versions = form.form_versions || [];
      for (const version of versions) {
        const metadata = version.metadata as { is_event_registration?: boolean } | undefined;
        if (metadata?.is_event_registration) {
          eventRegistrationFormIds.add(form.id);
          eventRegistrationVersionIds.add(version.id);
        }
      }
    }

    if (eventRegistrationVersionIds.size === 0) {
      return {
        success: true,
        message: formId
          ? "No event registration versions found for this form."
          : "No event registration forms found.",
        updated: 0,
      };
    }

    // Get all responses for these versions that don't have attendant_uuid
    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["id", "attendant_uuid", "form_version_id"],
        filter: {
          form_version_id: { _in: Array.from(eventRegistrationVersionIds) },
          _or: [
            { attendant_uuid: { _null: true } },
            { attendant_uuid: { _empty: true } },
          ],
        },
        limit: -1,
      })
    ) as unknown as Array<{
      id: string;
      attendant_uuid?: string | null;
      form_version_id: string;
    }>;

    if (responses.length === 0) {
      return {
        success: true,
        message: "All responses already have UUIDs.",
        updated: 0,
      };
    }

    // Generate UUIDs and update responses
    let updated = 0;
    const errors: string[] = [];

    for (const response of responses) {
      try {
        const uuid = crypto.randomUUID();
        await client.request(
          updateItem("form_responses" as any, response.id, {
            attendant_uuid: uuid,
          })
        );
        updated++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to update response ${response.id}: ${errorMsg}`);
        console.error(`Error updating response ${response.id}:`, error);
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

export async function getCompanyFormsForEvent(
  eventId: string,
  companyOptionIds: string[],
  retries = 2,
  /** When true, only return forms explicitly assigned via option_ids (excludes forms with empty option_ids) */
  requireOptionAssignment = false
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const client = await getAuthedDirectusOrThrow();

      // Get all forms with active versions
      const forms = await client.request(
        readItems("forms" as any, {
          fields: ["*", { form_versions: ["*"] } as any],
          filter: {
            is_active: { _eq: true },
          },
        })
      ) as unknown as Form[];

      // Filter for company forms linked to this event.
      // For assignment (which options must fill the form): only use the ACTIVE version's option_ids.
      // So if an old version was assigned to many options but the active version only to a few, only those few apply.
      const companyForms: Array<{
        id: string;
        name: string;
        slug: string;
        description?: string;
        metadata: FormMetadata;
        activeVersion: { id: string; version_number: number; schema: FormSchema };
      }> = [];

      // Normalize option ID for comparison (Directus may return string, number, or { id: string })
      const normalizeOptionId = (id: unknown): string => {
        if (id == null) return "";
        if (typeof id === "string") return id;
        if (typeof id === "number") return String(id);
        if (typeof id === "object" && id !== null && "id" in id) return String((id as { id: unknown }).id);
        return String(id);
      };
      const companyOptionIdSet = new Set(companyOptionIds.map(normalizeOptionId).filter(Boolean));

      for (const form of forms) {
        const versions = form.form_versions || [];
        const activeVersion = versions.find((v) => v.is_active);
        if (!activeVersion) continue;

        const metadata = (activeVersion as FormVersion & { metadata?: FormMetadata })?.metadata;
        if (!metadata?.is_company_form) continue;
        if (String(metadata.event_id) !== String(eventId)) continue;

        // Assignment: only active version's option_ids determine which options must fill this form
        const rawOptionIds = metadata.option_ids || [];
        if (requireOptionAssignment && rawOptionIds.length === 0) continue;
        if (rawOptionIds.length > 0) {
          const requiredIds = rawOptionIds.map(normalizeOptionId).filter(Boolean);
          const hasRequiredOption = requiredIds.some((optId) => companyOptionIdSet.has(optId));
          if (!hasRequiredOption) continue;
        }

        companyForms.push({
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
        });
      }

      return companyForms;
    } catch (error: any) {
      // For network errors, retry with exponential backoff
      const isNetworkError = error?.message?.includes("fetch failed") ||
        error?.message?.includes("network") ||
        error?.message?.includes("ECONNREFUSED") ||
        error?.message?.includes("ETIMEDOUT");

      if (isNetworkError && attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5 seconds
        console.warn(`[getCompanyFormsForEvent] Network error (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // For other errors or final retry, log and return empty array
      console.error("[getCompanyFormsForEvent] Error fetching company forms:", error);
      return [];
    }
  }
  return [];
}

/** Get ALL company forms for an event (for admin floorplan filtering). No company option filter. */
export async function getAllCompanyFormsForEvent(eventId: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
    const forms = await client.request(
      readItems("forms" as any, {
        fields: ["*", "form_versions.*"],
        filter: { is_active: { _eq: true } },
      })
    ) as unknown as Form[];

    const companyForms: Array<{
      id: string;
      name: string;
      slug: string;
      activeVersion: { id: string; version_number: number; schema: FormSchema };
    }> = [];

    for (const form of forms) {
      const versions = form.form_versions || [];
      const activeVersion = versions.find((v) => v.is_active);
      if (!activeVersion) continue;

      const metadata = (activeVersion as FormVersion & { metadata?: FormMetadata })?.metadata;
      if (!metadata?.is_company_form) continue;
      if (String(metadata.event_id) !== String(eventId)) continue;

      companyForms.push({
        id: form.id,
        name: form.name,
        slug: form.slug,
        activeVersion: {
          id: activeVersion.id,
          version_number: activeVersion.version_number,
          schema: activeVersion.schema,
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
    const { getServerDirectusClient } = await import("@/lib/directus");
    const client = await getServerDirectusClient();

    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["id", "company_id", "data"],
        filter: {
          _and: [
            { form_version_id: { _eq: formVersionId } },
            { company_id: { _nnull: true } },
            NOT_ARCHIVED_FILTER,
          ],
        },
        limit: -1,
        sort: "-submitted_at",
      })
    ) as unknown as Array<{ id: string; company_id: string | { id: string }; data: Record<string, unknown> }>;

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
    const { getServerDirectusClient } = await import("@/lib/directus");
    const client = await getServerDirectusClient();

    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["id", "company_id", "data"],
        filter: {
          _and: [
            { form_version_id: { _eq: formVersionId } },
            { company_id: { _nnull: true } },
            NOT_ARCHIVED_FILTER,
          ],
        },
        limit: -1,
        sort: "-submitted_at",
      })
    ) as unknown as Array<{ id: string; company_id: string | { id: string }; data: Record<string, unknown> }>;

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
    const { getServerDirectusClient } = await import("@/lib/directus");
    const client = await getServerDirectusClient();

    const versions = await listFormVersionsForServer(formId);
    const versionIds = versions.map((v) => v.id);
    if (versionIds.length === 0) return {};

    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["id", "company_id", "data", "submitted_at"],
        filter: {
          _and: [
            { form_version_id: { _in: versionIds } },
            { company_id: { _nnull: true } },
            NOT_ARCHIVED_FILTER,
          ],
        },
        limit: -1,
        sort: "-submitted_at",
      })
    ) as unknown as Array<{ company_id: string | { id: string }; data: Record<string, unknown> }>;

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
    const { getServerDirectusClient } = await import("@/lib/directus");
    const client = await getServerDirectusClient();
    if (!client) return [];

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
      const responses = await client.request(
        readItems("form_responses" as any, {
          fields: ["id", "company_id", "data"],
          filter: {
            _and: [
              { form_version_id: { _in: versionIds } },
              { company_id: { _nnull: true } },
              NOT_ARCHIVED_FILTER,
            ],
          },
          limit: -1,
          sort: "-submitted_at",
        })
      ) as unknown as Array<{ company_id: string | { id: string }; data: Record<string, unknown> }>;
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
    const { getServerDirectusClient } = await import("@/lib/directus");
    const client = await getServerDirectusClient();
    if (!client) return result;

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
      const responses = await client.request(
        readItems("form_responses" as any, {
          fields: ["id", "company_id", "data"],
          filter: {
            _and: [
              { form_version_id: { _in: versionIds } },
              { company_id: { _nnull: true } },
              NOT_ARCHIVED_FILTER,
            ],
          },
          limit: -1,
          sort: "-submitted_at",
        })
      ) as unknown as Array<{ company_id: string | { id: string }; data: Record<string, unknown> }>;
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

    const { getServerDirectusClient } = await import("@/lib/directus");
    const client = await getServerDirectusClient();
    if (!client) return [];

    const valuesSeen = new Set<string>();
    const orderedValues: string[] = [];
    for (const { formId, fieldName } of categoryFields) {
      const versions = await listFormVersionsForServer(formId);
      const versionIds = versions.map((v) => v.id);
      if (versionIds.length === 0) continue;
      const responses = await client.request(
        readItems("form_responses" as any, {
          fields: ["id", "company_id", "data"],
          filter: {
            _and: [
              { form_version_id: { _in: versionIds } },
              { company_id: { _eq: companyId } },
              NOT_ARCHIVED_FILTER,
            ],
          },
          limit: 1,
          sort: "-submitted_at",
        })
      ) as unknown as Array<{ data: Record<string, unknown> }>;
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
    const { getServerDirectusClient } = await import("@/lib/directus");
    const client = await getServerDirectusClient();
    if (!client) return result;

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
      const responses = await client.request(
        readItems("form_responses" as any, {
          fields: ["id", "company_id", "data"],
          filter: {
            _and: [
              { form_version_id: { _in: versionIds } },
              { company_id: { _in: companyIds } },
              NOT_ARCHIVED_FILTER,
            ],
          },
          limit: -1,
          sort: "-submitted_at",
        })
      ) as unknown as Array<{ company_id: string | { id: string }; data: Record<string, unknown> }>;
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
    // Try authenticated first, fall back to public client for public form access
    let client;
    try {
      client = await getAuthedDirectusOrThrow();
    } catch {
      // If auth fails, use public client for public form access
      client = directus;
    }

    // Get form by slug
    const forms = await client.request(
      readItems("forms" as any, {
        fields: ["*", { form_versions: ["*"] } as any],
        filter: {
          slug: { _eq: slug },
          is_active: { _eq: true },
        },
        limit: 1,
      })
    ) as unknown as Form[];

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
    const { getServerDirectusClient } = await import("@/lib/directus");
    const serverClient = await getServerDirectusClient();

    if (formVersionIds.length === 0) return new Set<string>();

    const { readItems } = await import("@directus/sdk");
    const responses = await serverClient.request(
      readItems("form_responses" as any, {
        fields: ["form_version_id", "company_id"],
        filter: {
          _and: [
            { company_id: { _eq: companyId } },
            { form_version_id: { _in: formVersionIds } },
          ],
        },
        limit: -1,
      })
    ) as unknown as Array<{ form_version_id: string; company_id: string }>;

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
    const { getServerDirectusClient } = await import("@/lib/directus");
    const serverClient = await getServerDirectusClient();
    const responses = await serverClient.request(
      readItems("form_responses" as any, {
        fields: ["form_version_id", "company_id"],
        filter: {
          _and: [
            { company_id: { _in: companyIds } },
            { form_version_id: { _in: formVersionIds } },
          ],
        },
        limit: -1,
      })
    ) as unknown as Array<{ form_version_id: string; company_id: string }>;
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
    const { getServerDirectusClient } = await import("@/lib/directus");
    const serverClient = await getServerDirectusClient();

    if (formIds.length === 0) return new Set<string>();

    const { readItems } = await import("@directus/sdk");

    // First, get all form version IDs for these forms
    const formVersions = await serverClient.request(
      readItems("form_versions" as any, {
        fields: ["id", "form_id"],
        filter: {
          form_id: { _in: formIds },
        },
        limit: -1,
      })
    ) as unknown as Array<{ id: string; form_id: string }>;

    if (formVersions.length === 0) return new Set<string>();

    const formVersionIds = formVersions.map((fv) => fv.id);

    // Check for responses across all versions of these forms
    const responses = await serverClient.request(
      readItems("form_responses" as any, {
        fields: ["form_version_id", "company_id"],
        filter: {
          _and: [
            { company_id: { _eq: companyId } },
            { form_version_id: { _in: formVersionIds } },
          ],
        },
        limit: -1,
      })
    ) as unknown as Array<{ form_version_id: string; company_id: string }>;

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
    const { getServerDirectusClient } = await import("@/lib/directus");
    const serverClient = await getServerDirectusClient();
    const formVersions = await serverClient.request(
      readItems("form_versions" as any, {
        fields: ["id", "form_id"],
        filter: { form_id: { _in: formIds } },
        limit: -1,
      })
    ) as unknown as Array<{ id: string; form_id: string }>;
    if (formVersions.length === 0) return result;
    const formVersionIds = formVersions.map((fv) => fv.id);
    const formVersionToFormId = new Map(formVersions.map((fv) => [fv.id, fv.form_id]));
    const responses = await serverClient.request(
      readItems("form_responses" as any, {
        fields: ["form_version_id", "company_id"],
        filter: {
          _and: [
            { company_id: { _in: companyIds } },
            { form_version_id: { _in: formVersionIds } },
          ],
        },
        limit: -1,
      })
    ) as unknown as Array<{ form_version_id: string; company_id: string }>;
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
      const { getServerDirectusClient } = await import("@/lib/directus");
      const serverClient = await getServerDirectusClient();
      for (const form of compulsoryForms) {
        const formVersions = await serverClient.request(
          readItems("form_versions" as any, {
            fields: ["id"],
            filter: {
              _and: [
                { form_id: { _eq: form.formId } },
                { version_number: { _gte: form.versionNumber! } },
              ],
            },
            limit: -1,
          })
        ) as unknown as Array<{ id: string }>;
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
    const { getServerDirectusClient } = await import("@/lib/directus");
    const serverClient = await getServerDirectusClient();
    const { readItems } = await import("@directus/sdk");

    // Get the most recent response for this specific form version and company
    // Sort by submitted_at descending to ensure we get the latest submission
    const responses = await serverClient.request(
      readItems("form_responses" as any, {
        fields: ["*"],
        filter: {
          _and: [
            { form_version_id: { _eq: formVersionId } },
            { company_id: { _eq: companyId } },
          ],
        },
        limit: 1,
        sort: "-submitted_at", // Most recent first
      })
    ) as unknown as FormResponse[];

    return responses[0] ?? null;
  } catch (error) {
    console.error("[getLatestCompanyFormResponse] Error fetching latest company form response:", error);
    return null;
  }
}

export async function getLatestCompanyFormResponseForForm(formId: string, companyId: string) {
  try {
    const { getServerDirectusClient } = await import("@/lib/directus");
    const serverClient = await getServerDirectusClient();
    const { readItems } = await import("@directus/sdk");

    // Get the most recent response across ALL versions of this form for this company
    // Sort by submitted_at descending to ensure we get the latest submission regardless of version
    const responses = await serverClient.request(
      readItems("form_responses" as any, {
        fields: ["*"],
        filter: {
          _and: [
            { company_id: { _eq: companyId } },
            {
              form_version_id: {
                form_id: { _eq: formId },
              },
            },
          ],
        },
        limit: 1,
        sort: "-submitted_at", // Most recent first
      })
    ) as unknown as FormResponse[];

    return responses[0] ?? null;
  } catch (error) {
    console.error("[getLatestCompanyFormResponseForForm] Error fetching latest company form response for form:", error);
    return null;
  }
}



