// lib/repos/forms.ts
"use server";

import { readItems, createItem, updateItem, deleteItem, readItem } from "@directus/sdk";
import { getAuthedDirectusOrThrow, directus } from "@/lib/directus";
import type { Form, FormVersion, FormResponse, FormSchema } from "@/lib/schema";

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

    console.log('[listForms] Querying Directus with params:', { search, limit, page, sort });
    const result = await client.request(
      readItems("forms", {
        fields: ["*", "form_versions.*"],  // Changed from "versions.*" to "form_versions.*"
        limit,
        page,
        sort,
        ...(search ? { search } : {}),
      })
    ) as unknown as Form[];

    console.log('[listForms] Query returned', result.length, 'forms');
    result.forEach(form => {
      console.log(`[listForms] Form "${form.name}": ${form.form_versions?.length || 0} versions,`,
        form.form_versions?.filter(v => v.is_active).length || 0, 'active');
    });

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
        fields: ["*", "form_versions.*"],  // Changed from "versions.*" to "form_versions.*"
      })
    ) as unknown as Form;
  } catch (error) {
    console.error("Error getting form by id:", error);
    throw error;
  }
}

export async function getFormBySlug(slug: string) {
  try {
    console.log('[getFormBySlug] Attempting to fetch form with slug:', slug);

    // Try authenticated first, fall back to public client
    let client;
    let isAuthenticated = false;
    try {
      client = await getAuthedDirectusOrThrow();
      isAuthenticated = true;
      console.log('[getFormBySlug] Using authenticated client');
    } catch (authError) {
      // If auth fails, use public client for public forms
      client = directus;
      console.log('[getFormBySlug] Using public client (no auth)');
    }

    console.log('[getFormBySlug] Querying Directus for slug:', slug);
    const forms = await client.request(
      readItems("forms", {
        fields: ["*", "form_versions.*"],  // Changed from "versions.*" to "form_versions.*"
        filter: { slug: { _eq: slug } },
        limit: 1,
      })
    ) as unknown as Form[];

    console.log('[getFormBySlug] Query result:', forms?.length || 0, 'forms found');
    if (forms?.[0]) {
      console.log('[getFormBySlug] Form ID:', forms[0].id, 'Versions:', forms[0].form_versions?.length || 0);
    }

    return forms?.[0] ?? null;
  } catch (error) {
    console.error("[getFormBySlug] Error getting form by slug:", error);
    throw error;
  }
}

export async function createForm(data: Partial<Form>) {
  try {
    const client = await getAuthedDirectusOrThrow();
    return client.request(
      createItem("forms", data)
    ) as unknown as Form;
  } catch (error) {
    console.error("Error creating form:", error);
    throw error;
  }
}

export async function updateForm(id: string, data: Partial<Form>) {
  try {
    const client = await getAuthedDirectusOrThrow();
    return client.request(
      updateItem("forms", id, data)
    ) as unknown as Form;
  } catch (error) {
    console.error("Error updating form:", error);
    throw error;
  }
}

export async function deleteForm(id: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
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
    console.log('[updateFormVersion] Updating version:', id, 'with data:', data);
    const client = await getAuthedDirectusOrThrow();

    // If activating this version, deactivate others
    if (data.is_active) {
      console.log('[updateFormVersion] Activating version, need to deactivate others');
      const version = await getFormVersionById(id);
      console.log('[updateFormVersion] Current version:', version);
      const formId = typeof version.form_id === "string" ? version.form_id : version.form_id.id;
      console.log('[updateFormVersion] Form ID:', formId);

      const existingVersions = await listFormVersions(formId);
      console.log('[updateFormVersion] Found', existingVersions.length, 'existing versions');

      for (const v of existingVersions) {
        if (v.id !== id && v.is_active) {
          console.log('[updateFormVersion] Deactivating version:', v.id);
          await client.request(
            updateItem("form_versions", v.id, { is_active: false })
          );
        }
      }
    }

    console.log('[updateFormVersion] Now updating version:', id);
    const result = await client.request(
      updateItem("form_versions", id, data)
    ) as unknown as FormVersion;
    console.log('[updateFormVersion] Update successful');
    return result;
  } catch (error) {
    console.error("[updateFormVersion] Error updating form version:", error);
    throw error;
  }
}

export async function deleteFormVersion(id: string) {
  try {
    const client = await getAuthedDirectusOrThrow();
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

