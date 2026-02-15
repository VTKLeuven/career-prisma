// lib/repos/forms.ts
"use server";

import { readItems, createItem, updateItem, deleteItem, readItem } from "@directus/sdk";
import { getAuthedDirectusOrThrow, directus } from "@/lib/directus";
import type { Form, FormVersion, FormResponse, FormSchema, FormMetadata } from "@/lib/schema";

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
      readItems("forms", {
        fields: ["*", "form_versions.*"],
        limit,
        page,
        sort,
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
      readItem("forms", id, {
        fields: ["*", "form_versions.*"],
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
      readItems("forms", {
        fields: ["*", "form_versions.*"],
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
      readItems("forms", {
        fields: ["*", "form_versions.*"],
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
      createItem("forms", formData)
    ) as unknown as Form;
    
    // Refetch to get all fields
    const result = await client.request(
      readItem("forms", created.id, {
        fields: ["*", "form_versions.*"],
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
      updateItem("forms", id, data)
    );
    
    // Refetch to get updated data with all fields
    const updated = await client.request(
      readItem("forms", id, {
        fields: ["*", "form_versions.*"],
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
        readItems("form_responses", {
          fields: ["id"],
          filter: { form_version_id: { _in: versionIds } },
          limit: -1, // Get all responses
        })
      ) as unknown as FormResponse[];
      
      // Delete each response
      for (const response of allResponses) {
        await client.request(deleteItem("form_responses", response.id));
      }
    }
    
    // Delete all versions
    for (const versionId of versionIds) {
      await client.request(deleteItem("form_versions", versionId));
    }
    
    // Finally, delete the form itself
    await client.request(deleteItem("forms", id));
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
      readItems("form_versions", {
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
    const { getServerDirectusClient } = await import("@/lib/directus");
    const client = await getServerDirectusClient();
    return client.request(
      readItems("form_versions", {
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
      readItem("form_versions", id, {
        fields: ["*", "form_id.*"],
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
            updateItem("form_versions", version.id, { is_active: false })
          );
        }
      }
    }

    return client.request(
      createItem("form_versions", data)
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
            updateItem("form_versions", v.id, { is_active: false })
          );
        }
      }
    }

    const result = await client.request(
      updateItem("form_versions", id, data)
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
      readItems("form_responses", {
        fields: ["id"],
        filter: { form_version_id: { _eq: id } },
        limit: -1, // Get all responses
      })
    ) as unknown as FormResponse[];
    
    // Delete all responses for this version
    for (const response of responses) {
      await client.request(deleteItem("form_responses", response.id));
    }
    
    // Delete the version itself
    await client.request(deleteItem("form_versions", id));
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
      readItems("form_versions", {
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
      readItems("form_versions", {
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

export async function listFormResponses(formVersionId: string, opts?: {
  limit?: number;
  page?: number;
}) {
  try {
    const client = await getAuthedDirectusOrThrow();
    const { limit = 25, page = 1 } = opts ?? {};

    const result = await client.request(
      readItems("form_responses", {
        fields: ["*", "user_id.name", "user_id.email", "form_version_id.form_id.name", "company_id.name", "company_id.id", "student_id.full_name", "student_id.first_name", "student_id.last_name", "student_id.email"],
        filter: { form_version_id: { _eq: formVersionId } },
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
      readItems("form_responses", {
        fields: ["id"],
        filter: { form_version_id: { _eq: formVersionId } },
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
      readItems("form_responses", {
        fields: ["submitted_at"],
        filter: { form_version_id: { _eq: formVersionId } },
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
      readItems("form_responses", {
        fields: ["submitted_at"],
        filter: { form_version_id: { _eq: formVersionId } },
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

/** Get a student's latest form response across any of the given form versions. Uses server client.
 * Matches by data._student_id (stored in form data JSON) since form_responses may not have a student_id column. */
export async function getStudentLatestFormResponseForForm(
  studentId: string,
  versionIds: string[]
): Promise<{ id: string; form_version_id: string; data: Record<string, unknown> } | null> {
  if (versionIds.length === 0) return null;
  try {
    const { getServerDirectusClient } = await import("@/lib/directus");
    const client = await getServerDirectusClient();
    // Fetch responses for these versions and match by data._student_id (no student_id column)
    const responses = await client.request(
      readItems("form_responses", {
        fields: ["id", "form_version_id", "data"],
        filter: { form_version_id: { _in: versionIds } },
        limit: 1000,
        sort: "-submitted_at",
      })
    ) as unknown as Array<{ id: string; form_version_id: string; data?: Record<string, unknown> }>;
    const match = responses.find(
      (r) => (r.data as Record<string, unknown>)?._student_id === studentId
    );
    return match ? { id: match.id, form_version_id: match.form_version_id, data: match.data ?? {} } : null;
  } catch (error) {
    console.error("[getStudentLatestFormResponseForForm] Error:", error);
    return null;
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
      readItems("form_responses", {
        fields: ["*", "user_id.name", "user_id.email", "form_version_id.form_id.name", "form_version_id.version_number", "company_id.name", "company_id.id", "student_id.full_name", "student_id.first_name", "student_id.last_name", "student_id.email"],
        filter: { form_version_id: { _in: versionIds } },
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
      readItems("form_responses", {
        fields: ["id"],
        filter: { form_version_id: { _in: versionIds } },
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
      readItems("form_responses", {
        fields: ["submitted_at"],
        filter: { form_version_id: { _in: versionIds } },
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
      readItems("form_responses", {
        fields: ["submitted_at"],
        filter: { form_version_id: { _in: versionIds } },
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
      readItem("form_responses", id, {
        fields: ["*", "user_id.*", "form_version_id.*"],
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
      createItem("form_responses", data)
    ) as unknown as FormResponse;
  } catch (error) {
    console.error("Error creating form response:", error);
    throw error;
  }
}

export async function deleteFormResponse(id: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
    await client.request(deleteItem("form_responses", id));
    return true;
  } catch (error) {
    console.error("Error deleting form response:", error);
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
      readItems("form_responses", {
        fields: ["id"],
        filter: { form_version_id: { _in: versionIds } },
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
      readItems("form_responses", {
        fields: ["id"],
        filter: { form_version_id: { _eq: formVersionId } },
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
      readItems("forms", {
        fields: ["id", "form_versions.id", "form_versions.metadata"],
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
      readItems("form_responses", {
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
          updateItem("form_responses", response.id, {
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
        readItems("forms", {
          fields: ["*", "form_versions.*"],
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
      readItems("forms", {
        fields: ["*", "form_versions.*"],
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
      readItems("form_responses", {
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
      readItems("form_responses", {
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
      readItems("form_versions", {
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
      readItems("form_responses", {
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
      readItems("form_versions", {
        fields: ["id", "form_id"],
        filter: { form_id: { _in: formIds } },
        limit: -1,
      })
    ) as unknown as Array<{ id: string; form_id: string }>;
    if (formVersions.length === 0) return result;
    const formVersionIds = formVersions.map((fv) => fv.id);
    const formVersionToFormId = new Map(formVersions.map((fv) => [fv.id, fv.form_id]));
    const responses = await serverClient.request(
      readItems("form_responses", {
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

export async function getLatestCompanyFormResponse(formVersionId: string, companyId: string) {
  try {
    // Use server client to ensure we can always read company-linked responses
    const { getServerDirectusClient } = await import("@/lib/directus");
    const serverClient = await getServerDirectusClient();
    const { readItems } = await import("@directus/sdk");

    // Get the most recent response for this specific form version and company
    // Sort by submitted_at descending to ensure we get the latest submission
    const responses = await serverClient.request(
      readItems("form_responses", {
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
      readItems("form_responses", {
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



