// app/actions/forms.ts
"use server";

import {
  listForms,
  getFormById,
  getFormBySlug,
  createForm,
  updateForm,
  deleteForm,
  listFormVersions,
  getFormVersionById,
  createFormVersion,
  updateFormVersion,
  deleteFormVersion,
  listFormResponses,
  getFormResponseById,
  createFormResponse,
} from "@/lib/repos/forms";
import type { Form, FormVersion, FormSchema } from "@/lib/schema";

// ===================== FORM ACTIONS =====================

export async function fetchFormsAction(opts?: {
  search?: string;
  limit?: number;
  page?: number;
  sort?: string;
}) {
  try {
    console.log('[fetchFormsAction] Fetching forms with options:', opts);
    const forms = await listForms(opts);
    console.log('[fetchFormsAction] Retrieved', forms.length, 'forms from Directus');

    const mapped = forms.map((form) => {
      const activeVersion = form.form_versions?.find((v) => v.is_active) ?? null;  // Changed from versions to form_versions
      console.log(`[fetchFormsAction] Form "${form.name}" (${form.slug}):`, {
        totalVersions: form.form_versions?.length || 0,  // Changed from versions to form_versions
        activeVersion: activeVersion ? `v${activeVersion.version_number}` : 'None',
        versions: form.form_versions?.map(v => ({ version: v.version_number, active: v.is_active }))  // Changed from versions to form_versions
      });

      return {
        id: form.id,
        name: form.name,
        slug: form.slug,
        description: form.description ?? "",
        created_at: form.created_at,
        updated_at: form.updated_at,
        activeVersion: activeVersion,
        versionCount: form.form_versions?.length ?? 0,  // Changed from versions to form_versions
      };
    });

    return mapped;
  } catch (error) {
    console.error("[fetchFormsAction] Error fetching forms:", error);
    throw error;
  }
}

export async function fetchFormByIdAction(id: string) {
  try {
    return await getFormById(id);
  } catch (error) {
    console.error("Error fetching form by id:", error);
    throw error;
  }
}

export async function createFormAction(data: {
  name: string;
  slug: string;
  description?: string;
  initialSchema?: FormSchema;
}) {
  try {
    const form = await createForm({
      name: data.name,
      slug: data.slug,
      description: data.description,
    });

    // Create initial version if schema provided
    if (data.initialSchema) {
      await createFormVersion({
        form_id: form.id,
        schema: data.initialSchema,
        version_number: 1,
        is_active: true,
      });
    }

    return form;
  } catch (error) {
    console.error("Error creating form:", error);
    throw error;
  }
}

export async function updateFormAction(id: string, data: Partial<Form>) {
  try {
    return await updateForm(id, data);
  } catch (error) {
    console.error("Error updating form:", error);
    throw error;
  }
}

export async function deleteFormAction(id: string) {
  try {
    return await deleteForm(id);
  } catch (error) {
    console.error("Error deleting form:", error);
    throw error;
  }
}

// ===================== FORM VERSION ACTIONS =====================

export async function fetchFormVersionsAction(formId: string) {
  try {
    return await listFormVersions(formId);
  } catch (error) {
    console.error("Error fetching form versions:", error);
    throw error;
  }
}

export async function fetchFormVersionByIdAction(id: string) {
  try {
    return await getFormVersionById(id);
  } catch (error) {
    console.error("Error fetching form version:", error);
    throw error;
  }
}

export async function createFormVersionAction(data: {
  form_id: string;
  schema: FormSchema;
  is_active?: boolean;
}) {
  try {
    // Get the next version number
    const versions = await listFormVersions(data.form_id);
    const maxVersion = Math.max(...versions.map((v) => v.version_number), 0);
    
    return await createFormVersion({
      form_id: data.form_id,
      schema: data.schema,
      version_number: maxVersion + 1,
      is_active: data.is_active ?? false,
    });
  } catch (error) {
    console.error("Error creating form version:", error);
    throw error;
  }
}

export async function updateFormVersionAction(id: string, data: Partial<FormVersion>) {
  try {
    return await updateFormVersion(id, data);
  } catch (error) {
    console.error("Error updating form version:", error);
    throw error;
  }
}

export async function deleteFormVersionAction(id: string) {
  try {
    return await deleteFormVersion(id);
  } catch (error) {
    console.error("Error deleting form version:", error);
    throw error;
  }
}

export async function setActiveVersionAction(versionId: string) {
  try {
    console.log('[setActiveVersionAction] Activating version:', versionId);
    const result = await updateFormVersion(versionId, { is_active: true });
    console.log('[setActiveVersionAction] Version activated successfully:', result);
    return result;
  } catch (error) {
    console.error("[setActiveVersionAction] Error setting active version:", error);
    throw error;
  }
}

// ===================== FORM RESPONSE ACTIONS =====================

export async function fetchFormResponsesAction(formVersionId: string, opts?: {
  limit?: number;
  page?: number;
}) {
  try {
    return await listFormResponses(formVersionId, opts);
  } catch (error) {
    console.error("Error fetching form responses:", error);
    throw error;
  }
}

export async function fetchFormResponseByIdAction(id: string) {
  try {
    return await getFormResponseById(id);
  } catch (error) {
    console.error("Error fetching form response:", error);
    throw error;
  }
}

export async function submitFormResponseAction(data: {
  form_version_id: string;
  user_id?: string;
  data: Record<string, unknown>;
  attachments?: string[];
}) {
  try {
    return await createFormResponse(data);
  } catch (error) {
    console.error("Error submitting form response:", error);
    throw error;
  }
}
// ===================== PUBLIC FORM ACTIONS =====================

// Upload file to Directus
export async function uploadFileAction(formData: FormData) {
  try {
    console.log('[uploadFileAction] Uploading file to Directus');

    const { directus } = await import("@/lib/directus");
    const { uploadFiles } = await import("@directus/sdk");

    const file = formData.get('file') as File;
    if (!file) {
      throw new Error('No file provided');
    }

    console.log('[uploadFileAction] File:', file.name, file.size, 'bytes');

    // Upload to Directus
    const result = await directus.request(
      uploadFiles(formData)
    );

    console.log('[uploadFileAction] Upload successful:', result);
    return result;
  } catch (error) {
    console.error('[uploadFileAction] Error uploading file:', error);
    throw error;
  }
}

// DEBUG ACTION - Temporary for troubleshooting
export async function debugFormsQueryAction() {
  try {
    console.log('[DEBUG] Starting debug query...');

    // Import directly to test
    const { getAuthedDirectusOrThrow } = await import("@/lib/directus");
    const { readItems } = await import("@directus/sdk");

    const client = await getAuthedDirectusOrThrow();
    console.log('[DEBUG] Got Directus client');

    // Try different query variations
    const query1 = await client.request(
      readItems("forms", {
        fields: ["*"],
      })
    );
    console.log('[DEBUG] Query 1 (fields: ["*"]):', JSON.stringify(query1, null, 2));

    const query2 = await client.request(
      readItems("forms", {
        fields: ["*", "versions.*"],
      })
    );
    console.log('[DEBUG] Query 2 (fields: ["*", "versions.*"]):', JSON.stringify(query2, null, 2));

    const query3 = await client.request(
      readItems("forms", {
        fields: ["*", { versions: ["*"] }],
      })
    );
    console.log('[DEBUG] Query 3 (fields: ["*", { versions: ["*"] }]):', JSON.stringify(query3, null, 2));

    return {
      query1Keys: Object.keys(query1[0] || {}),
      query2Keys: Object.keys(query2[0] || {}),
      query3Keys: Object.keys(query3[0] || {}),
      hasVersionsInQuery1: !!(query1[0] as unknown as {versions?: unknown})?.versions,
      hasVersionsInQuery2: !!(query2[0] as unknown as {versions?: unknown})?.versions,
      hasVersionsInQuery3: !!(query3[0] as unknown as {versions?: unknown})?.versions,
    };
  } catch (error) {
    console.error('[DEBUG] Error in debug query:', error);
    throw error;
  }
}

export async function fetchPublicFormBySlugAction(slug: string) {
  try {
    console.log('[fetchPublicFormBySlugAction] Fetching form with slug:', slug);

    const form = await getFormBySlug(slug);
    console.log('[fetchPublicFormBySlugAction] Form data:', form ? 'Found' : 'Not found');

    if (!form) {
      console.log('[fetchPublicFormBySlugAction] No form found with slug:', slug);
      return null;
    }

    console.log('[fetchPublicFormBySlugAction] Form has versions:', form.form_versions?.length || 0);  // Changed from versions to form_versions

    // Get the active version
    const activeVersion = form.form_versions?.find((v) => v.is_active);  // Changed from versions to form_versions
    console.log('[fetchPublicFormBySlugAction] Active version:', activeVersion ? `v${activeVersion.version_number}` : 'None');

    if (!activeVersion) {
      console.log('[fetchPublicFormBySlugAction] No active version found');
      return null;
    }

    return {
      id: form.id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      activeVersion: {
        id: activeVersion.id,
        version_number: activeVersion.version_number,
        schema: activeVersion.schema,
      },
    };
  } catch (error) {
    console.error('[fetchPublicFormBySlugAction] Error fetching public form:', error);
    return null;
  }
}


