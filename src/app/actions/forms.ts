// app/actions/forms.ts
"use server";

import {
  listForms,
  getFormById,
  getFormBySlug,
  getPublicFormBySlug,
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
  deleteFormResponse,
  countFormResponses,
  countFormVersionResponses,
} from "@/lib/repos/forms";
import type { Form, FormVersion, FormSchema, FormMetadata } from "@/lib/schema";

// ===================== FORM ACTIONS =====================

export async function fetchFormsAction(opts?: {
  search?: string;
  limit?: number;
  page?: number;
  sort?: string;
}) {
  try {
    const forms = await listForms(opts);

    const mapped = await Promise.all(forms.map(async (form) => {
      const activeVersion = form.form_versions?.find((v) => v.is_active) ?? null;
      const submissionCount = await countFormResponses(form.id);

      return {
        id: form.id,
        name: form.name,
        slug: form.slug,
        description: form.description ?? "",
        is_active: form.is_active ?? true,
        metadata: (activeVersion as FormVersion & { metadata?: Record<string, unknown> })?.metadata, // Get metadata from active version
        created_at: form.created_at,
        updated_at: form.updated_at,
        activeVersion: activeVersion ? {
          id: activeVersion.id,
          version_number: activeVersion.version_number,
        } : null,
        versionCount: form.form_versions?.length ?? 0,
        submissionCount,
      };
    }));

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
  metadata?: {
    is_event_registration?: boolean;
    event_email_subject?: string;
    event_email_content?: string;
    event_date?: string;
    event_location?: string;
    [key: string]: unknown;
  };
}) {
  try {
    console.log('[createFormAction] Received metadata:', JSON.stringify(data.metadata, null, 2));
    const form = await createForm({
      name: data.name,
      slug: data.slug,
      description: data.description,
    });
    console.log('[createFormAction] Created form:', JSON.stringify(form, null, 2));

    // Create initial version if schema provided, with metadata
    if (data.initialSchema) {
      const version = await createFormVersion({
        form_id: form.id,
        schema: data.initialSchema,
        version_number: 1,
        is_active: true,
        metadata: data.metadata, // Save metadata to form_version
      });
      console.log('[createFormAction] Created version with metadata:', (version as FormVersion & { metadata?: Record<string, unknown> })?.metadata);
    }

    return form;
  } catch (error) {
    console.error("Error creating form:", error);
    throw error;
  }
}

export async function updateFormAction(id: string, data: Partial<Form & { metadata?: Record<string, unknown> }>) {
  try {
    // If metadata is provided, we need to update the active form version instead
    if (data.metadata !== undefined) {
      // Get the form to find the active version
      const form = await getFormById(id);
      const activeVersion = form.form_versions?.find((v) => v.is_active);

      if (activeVersion) {
        // Update the form version metadata
        await updateFormVersion(activeVersion.id, { metadata: data.metadata } as Partial<FormVersion & { metadata?: Record<string, unknown> }>);
      }

      // Remove metadata from form update data
      const { metadata, ...formData } = data;
      return await updateForm(id, formData);
    }

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
  metadata?: FormMetadata;
}) {
  try {
    // Get the next version number
    const versions = await listFormVersions(data.form_id);
    const maxVersion = Math.max(...versions.map((v) => v.version_number), 0);
    
    // If metadata is not provided, preserve metadata from the previous active version
    let metadataToUse = data.metadata;
    if (!metadataToUse) {
      const activeVersion = versions.find((v) => v.is_active);
      if (activeVersion && activeVersion.metadata) {
        metadataToUse = activeVersion.metadata as FormMetadata;
      }
    }
    
    return await createFormVersion({
      form_id: data.form_id,
      schema: data.schema,
      version_number: maxVersion + 1,
      is_active: data.is_active ?? false,
      metadata: metadataToUse,
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
    return await updateFormVersion(versionId, { is_active: true });
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

export async function deleteFormResponseAction(id: string) {
  try {
    return await deleteFormResponse(id);
  } catch (error) {
    console.error("Error deleting form response:", error);
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
    // Get the form version to check metadata (including max_entries)
    const formVersion = await getFormVersionById(data.form_version_id);
    const versionMetadata = (formVersion as FormVersion & { metadata?: Record<string, unknown> })?.metadata;

    // Check max_entries limit before creating the response
    // Always check server-side using server client (works for both authenticated and public submissions)
    if (versionMetadata?.max_entries) {
      const maxEntries = versionMetadata.max_entries as number;
      try {
        // Use server client which has elevated permissions for counting
        const { getServerDirectusClient } = await import("@/lib/directus");
        const serverClient = await getServerDirectusClient();
        
        // Count using server client - we need to call it directly with the client
        const { readItems } = await import("@directus/sdk");
        const responses = await serverClient.request(
          readItems("form_responses", {
            fields: ["id"],
            filter: { form_version_id: { _eq: data.form_version_id } },
            limit: -1, // Get all to count
          })
        ) as unknown as Array<{ id: string }>;
        
        const currentCount = responses.length;
        
        if (currentCount >= maxEntries) {
          throw new Error(`This form has reached its maximum capacity and is no longer accepting new submissions.`);
        }
      } catch (error) {
        // If it's the "form is full" error, re-throw it
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('maximum capacity')) {
          throw error;
        }
        
        // Check if this is an authentication error (401)
        const errorAny = error as any;
        const responseStatus = errorAny?.response?.status ?? errorAny?.status;
        const isAuthError = responseStatus === 401 || 
                          errorMessage.includes('Invalid user credentials') || 
                          errorMessage.includes('Unauthorized');
        
        if (isAuthError) {
          console.error('[submitFormResponseAction] Authentication error checking form capacity');
          throw new Error("Unable to verify form capacity due to authentication error. Please contact support if this persists.");
        } else {
          console.error("Error checking form capacity:", errorMessage);
          throw new Error("Unable to verify form capacity. Please try again or contact support.");
        }
      }
    }

    // Check deadline
    if (versionMetadata?.deadline) {
      const deadline = new Date(versionMetadata.deadline as string);
      const now = new Date();
      if (now > deadline) {
        throw new Error(`This form's deadline has passed. The deadline was ${new Date(versionMetadata.deadline as string).toLocaleString()}.`);
      }
    }

    const response = await createFormResponse(data);
    
    // If this is an event registration form, send confirmation email
    if (response && data.data.email) {
      if (versionMetadata?.is_event_registration) {
        // Get form name - prefer from loaded relation, otherwise fetch it
        let formName: string;
        if (typeof formVersion.form_id !== 'string' && formVersion.form_id?.name) {
          // Form relation is already loaded in formVersion
          formName = formVersion.form_id.name;
        } else {
          // Need to fetch form separately
          const formId = typeof formVersion.form_id === 'string' ? formVersion.form_id : formVersion.form_id.id;
          try {
            const form = await getFormById(formId);
            formName = form.name;
          } catch (error) {
            console.warn("Could not get form details, using fallback name:", error);
            formName = 'Event'; // Last resort fallback
          }
        }

        if (versionMetadata.is_event_registration) {
          await sendEventConfirmationEmail({
            to: data.data.email as string,
            name: (data.data.name as string) || '',
            surname: (data.data.surname as string) || '',
            formName: formName,
            subject: (versionMetadata.event_email_subject as string) || `${formName} - Registration Confirmation`,
            content: (versionMetadata.event_email_content as string) || 'Thank you for registering!',
            eventDate: versionMetadata.event_date as string | undefined,
            eventEndDate: versionMetadata.event_end_date as string | undefined,
            eventLocation: versionMetadata.event_location as string | undefined,
          });
        }
      }
    }
    
    return response;
  } catch (error) {
    console.error("Error submitting form response:", error);
    throw error;
  }
}

async function sendEventConfirmationEmail({
  to,
  name,
  surname,
  formName,
  subject,
  content,
  eventDate,
  eventEndDate,
  eventLocation,
}: {
  to: string;
  name: string;
  surname: string;
  formName: string;
  subject: string;
  content: string;
  eventDate?: string;
  eventEndDate?: string;
  eventLocation?: string;
}) {
  try {
    const { sendEmail } = await import("@/lib/repos/directus");
    const { generateEventConfirmationEmailHtml } = await import("@/lib/email-templates");
    
    const fullName = `${name} ${surname}`.trim() || 'Guest';
    
    // Replace placeholders in email content
    // If content is already HTML (from TipTap), just replace placeholders
    // Otherwise, convert newlines to <br>
    let personalizedContent = content
      .replace(/{name}/g, name || 'Guest')
      .replace(/{surname}/g, surname || '');
    
    // Only convert newlines if content doesn't appear to be HTML
    if (!personalizedContent.includes('<') || !personalizedContent.includes('>')) {
      personalizedContent = personalizedContent.replace(/\n/g, '<br>');
    }
    
    const emailHtml = generateEventConfirmationEmailHtml({
      subject,
      fullName,
      personalizedContent,
      eventDate: eventDate || undefined,
      eventEndDate: eventEndDate || undefined,
      eventLocation: eventLocation || undefined,
      formName,
    });
    
    await sendEmail({
      to,
      subject,
      html: emailHtml,
    });
  } catch (error) {
    console.error("Error sending event confirmation email:", error);
    // Don't throw - email failure shouldn't prevent form submission
  }
}
// ===================== PUBLIC FORM ACTIONS =====================

// Upload file to Directus
export async function uploadFileAction(formData: FormData) {
  try {
    // Try to get the file from FormData
    let file = formData.get('file') as File | null;
    
    // If file is not found, check all entries (for debugging)
    if (!file) {
      const entries: string[] = [];
      for (const [key, value] of formData.entries()) {
        entries.push(`${key}: ${value instanceof File ? `File(${value.name})` : String(value)}`);
      }
      console.error('[uploadFileAction] FormData entries:', entries);
      throw new Error('No file provided in FormData. Available entries: ' + entries.join(', '));
    }

    // Get Directus URL and auth token
    const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL;
    if (!directusUrl) {
      throw new Error('Directus URL not configured');
    }

    // Try to get auth token
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
    const token = cookieStore.get(ACCESS_COOKIE)?.value;

    // Recreate FormData for upload
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    // Prepare headers
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Upload directly to Directus using fetch
    const uploadUrl = `${directusUrl.replace(/\/$/, '')}/files`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: uploadFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(`Directus upload failed: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    
    // Extract file ID from Directus response
    const fileId = result?.data?.id || result?.id;
    if (!fileId) {
      throw new Error('Failed to extract file ID from upload result');
    }

    return { id: fileId };
  } catch (error) {
    console.error('[uploadFileAction] Error uploading file:', error);
    throw error;
  }
}

export async function fetchPublicFormBySlugAction(slug: string) {
  try {
    // Use dedicated public form fetcher that always uses public client
    const form = await getPublicFormBySlug(slug);

    if (!form) {
      return null;
    }

    // Check if form is disabled
    if (form.is_active === false) {
      return null;
    }

    // Get the active version
    const activeVersion = form.form_versions?.find((v) => v.is_active);

    if (!activeVersion) {
      return null;
    }

    const versionMetadata = (activeVersion as FormVersion & { metadata?: Record<string, unknown> })?.metadata;
    
    // Check if form is full using server client (works for both authenticated and public access)
    let isFull = false;
    if (versionMetadata?.max_entries) {
      try {
        // Use server client which has elevated permissions for counting
        const { getServerDirectusClient } = await import("@/lib/directus");
        const serverClient = await getServerDirectusClient();
        
        // Check if server token is available
        const hasServerToken = !!process.env.DIRECTUS_SERVER_TOKEN;
        if (!hasServerToken) {
          console.warn('[fetchPublicFormBySlugAction] DIRECTUS_SERVER_TOKEN not set, capacity check may fail');
        }
        
        const { readItems } = await import("@directus/sdk");
        const responses = await serverClient.request(
          readItems("form_responses", {
            fields: ["id"],
            filter: { form_version_id: { _eq: activeVersion.id } },
            limit: -1, // Get all to count
          })
        ) as unknown as Array<{ id: string }>;
        
        const currentCount = responses.length;
        const maxEntries = versionMetadata.max_entries as number;
        isFull = currentCount >= maxEntries;
      } catch (error) {
        // If we can't check, log but don't block form loading
        // The submission action will also check and block if needed
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorAny = error as any;
        const responseStatus = errorAny?.response?.status ?? errorAny?.status;
        const isAuthError = responseStatus === 401 || 
                          errorMessage.includes('Invalid user credentials') || 
                          errorMessage.includes('Unauthorized');
        
        if (isAuthError) {
          console.error('[fetchPublicFormBySlugAction] Authentication error checking form capacity');
        } else {
          console.error('[fetchPublicFormBySlugAction] Could not check form capacity:', errorMessage);
        }
        // Don't set isFull to true on error - let the form load and handle capacity check on submission
      }
    }

    return {
      id: form.id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      metadata: versionMetadata, // Get metadata from active version
      activeVersion: {
        id: activeVersion.id,
        version_number: activeVersion.version_number,
        schema: activeVersion.schema,
      },
      isFull, // Indicates if form has reached max capacity
    };
  } catch (error) {
    // Log detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[fetchPublicFormBySlugAction] Error fetching public form:', {
      slug,
      error: errorMessage,
      hint: 'Check Directus permissions: Public role needs READ access to "forms" and "form_versions" collections'
    });
    return null;
  }
}


