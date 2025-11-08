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
  countFormResponses,
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
        activeVersion: activeVersion,
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

export async function submitFormResponseAction(data: {
  form_version_id: string;
  user_id?: string;
  data: Record<string, unknown>;
  attachments?: string[];
}) {
  try {
    const response = await createFormResponse(data);
    
    // If this is an event registration form, send confirmation email
    if (response && data.data.email) {
      // Get the form to check if it's an event registration
      const formVersion = await getFormVersionById(data.form_version_id);
      if (formVersion) {
        const formId = typeof formVersion.form_id === 'string' ? formVersion.form_id : formVersion.form_id.id;
        const form = await getFormById(formId);
        const versionMetadata = (formVersion as FormVersion & { metadata?: Record<string, unknown> })?.metadata;
        
        if (versionMetadata?.is_event_registration) {
          await sendEventConfirmationEmail({
            to: data.data.email as string,
            name: (data.data.name as string) || '',
            surname: (data.data.surname as string) || '',
            formName: form.name,
            subject: (versionMetadata.event_email_subject as string) || 'Event Registration Confirmation',
            content: (versionMetadata.event_email_content as string) || 'Thank you for registering!',
            eventDate: versionMetadata.event_date as string | undefined,
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
  eventLocation,
}: {
  to: string;
  name: string;
  surname: string;
  formName: string;
  subject: string;
  content: string;
  eventDate?: string;
  eventLocation?: string;
}) {
  try {
    const { sendEmail } = await import("@/lib/repos/directus");
    
    // Generate calendar link
    const formDomain = process.env.NEXT_PUBLIC_FORM_DOMAIN || "http://localhost:3000";
    const calendarUrl = eventDate 
      ? `${formDomain}/api/calendar?title=${encodeURIComponent(formName)}&date=${encodeURIComponent(eventDate)}&location=${encodeURIComponent(eventLocation || '')}`
      : null;
    
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
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .button:hover { background-color: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>${subject}</h2>
            <p>Dear ${fullName},</p>
            <div>${personalizedContent}</div>
            ${eventDate ? `<p><strong>Event Date:</strong> ${new Date(eventDate).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>` : ''}
            ${eventLocation ? `<p><strong>Location:</strong> ${eventLocation}</p>` : ''}
            ${calendarUrl ? `
              <p>
                <a href="${calendarUrl}" class="button">📅 Add to Calendar</a>
              </p>
            ` : ''}
            <p>Best regards,<br>The ${formName} Team</p>
          </div>
        </body>
      </html>
    `;
    
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

    return {
      id: form.id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      metadata: (activeVersion as FormVersion & { metadata?: Record<string, unknown> })?.metadata, // Get metadata from active version
      activeVersion: {
        id: activeVersion.id,
        version_number: activeVersion.version_number,
        schema: activeVersion.schema,
      },
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


