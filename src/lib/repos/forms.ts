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
    const client = await getAuthedDirectusOrThrow();
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

export async function getFormVersionById(id: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
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

// ===================== FORM RESPONSES =====================

export async function listFormResponses(formVersionId: string, opts?: {
  limit?: number;
  page?: number;
}) {
  try {
    const client = await getAuthedDirectusOrThrow();
    const { limit = 25, page = 1 } = opts ?? {};

    return client.request(
      readItems("form_responses", {
        fields: ["*", "user_id.name", "user_id.email", "form_version_id.form_id.name"],
        filter: { form_version_id: { _eq: formVersionId } },
        limit,
        page,
        sort: "-submitted_at",
      })
    ) as unknown as FormResponse[];
  } catch (error) {
    console.error("Error listing form responses:", error);
    throw error;
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

