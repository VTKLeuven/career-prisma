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
  updateFormResponse,
  countFormResponses,
  countFormVersionResponses,
} from "@/lib/repos/forms";
import type { Form, FormVersion, FormSchema, FormMetadata, FormResponse } from "@/lib/schema";
import { getFormUploadsFolderId } from "@/lib/directus";

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
    event_id?: string;
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

export async function fetchFormResponsesTotalCountAction(formVersionId: string) {
  try {
    const { getFormResponsesTotalCount } = await import("@/lib/repos/forms");
    return await getFormResponsesTotalCount(formVersionId);
  } catch (error) {
    console.error("Error fetching form responses total count:", error);
    return 0;
  }
}

export async function fetchAllFormResponsesAction(formVersionId: string) {
  try {
    return await listFormResponses(formVersionId, { limit: -1 });
  } catch (error) {
    console.error("Error fetching all form responses:", error);
    throw error;
  }
}

export async function fetchFirstFormResponseAction(formVersionId: string) {
  try {
    const { getFirstFormResponse } = await import("@/lib/repos/forms");
    return await getFirstFormResponse(formVersionId);
  } catch (error) {
    console.error("Error fetching first form response:", error);
    return null;
  }
}

export async function fetchLatestFormResponseAction(formVersionId: string) {
  try {
    const { getLatestFormResponse } = await import("@/lib/repos/forms");
    return await getLatestFormResponse(formVersionId);
  } catch (error) {
    console.error("Error fetching latest form response:", error);
    return null;
  }
}

// Actions for fetching responses across all versions
export async function fetchFormResponsesForAllVersionsAction(formId: string, opts?: {
  limit?: number;
  page?: number;
}) {
  try {
    const { listFormResponsesForAllVersions } = await import("@/lib/repos/forms");
    return await listFormResponsesForAllVersions(formId, opts);
  } catch (error) {
    console.error("Error fetching form responses for all versions:", error);
    throw error;
  }
}

export async function fetchFormResponsesTotalCountForAllVersionsAction(formId: string) {
  try {
    const { getFormResponsesTotalCountForAllVersions } = await import("@/lib/repos/forms");
    return await getFormResponsesTotalCountForAllVersions(formId);
  } catch (error) {
    console.error("Error fetching form responses total count for all versions:", error);
    return 0;
  }
}

export async function fetchFirstFormResponseForAllVersionsAction(formId: string) {
  try {
    const { getFirstFormResponseForAllVersions } = await import("@/lib/repos/forms");
    return await getFirstFormResponseForAllVersions(formId);
  } catch (error) {
    console.error("Error fetching first form response for all versions:", error);
    return null;
  }
}

export async function fetchLatestFormResponseForAllVersionsAction(formId: string) {
  try {
    const { getLatestFormResponseForAllVersions } = await import("@/lib/repos/forms");
    return await getLatestFormResponseForAllVersions(formId);
  } catch (error) {
    console.error("Error fetching latest form response for all versions:", error);
    return null;
  }
}

export async function fetchAllFormResponsesForAllVersionsAction(formId: string) {
  try {
    const { listFormResponsesForAllVersions } = await import("@/lib/repos/forms");
    return await listFormResponsesForAllVersions(formId, { limit: -1 });
  } catch (error) {
    console.error("Error fetching all form responses for all versions:", error);
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

export async function updateFormResponseAction(
  id: string,
  data: {
    data?: Record<string, unknown>;
    submitter_first_name?: string;
    submitter_last_name?: string;
    submitter_email?: string;
  }
) {
  try {
    return await updateFormResponse(id, data);
  } catch (error) {
    console.error("Error updating form response:", error);
    throw error;
  }
}

export async function initializeAttendantUuidsAction(formId?: string) {
  try {
    const { initializeAttendantUuids } = await import("@/lib/repos/forms");
    return await initializeAttendantUuids(formId);
  } catch (error) {
    console.error("Error initializing attendant UUIDs:", error);
    throw error;
  }
}

export async function submitFormResponseAction(data: {
  form_version_id: string;
  user_id?: string;
  data: Record<string, unknown>;
  attachments?: string[];
  company_id?: string;
  submitter_first_name?: string;
  submitter_last_name?: string;
  submitter_email?: string;
}) {
  try {
    // Get the form version to check metadata (including max_entries)
    // Use server client to ensure we always have access to metadata, even for public forms
    const { getServerDirectusClient } = await import("@/lib/directus");
    const serverClient = await getServerDirectusClient();
    const { readItem } = await import("@directus/sdk");

    const formVersionsColl = "form_versions" as const;
    const formVersion = await serverClient.request(
      readItem(formVersionsColl as any, data.form_version_id, {
        fields: ["*", { form_id: ["*"] } as any],
      })
    ) as unknown as FormVersion;

    const versionMetadata = (formVersion as FormVersion & { metadata?: Record<string, unknown> })?.metadata;

    // Check if form requires login (event registration forms always require login) and verify student is authenticated
    const toBoolFlag = (v: unknown): boolean => {
      if (v === true) return true;
      if (v === false) return false;
      if (v === 1 || v === "1") return true;
      if (v === 0 || v === "0") return false;
      if (typeof v === "string") {
        const s = v.trim().toLowerCase();
        if (s === "true" || s === "yes" || s === "y") return true;
        if (s === "false" || s === "no" || s === "n" || s === "") return false;
      }
      return false;
    };

    const isEventRegistration = toBoolFlag(versionMetadata?.is_event_registration);
    const isCompanyForm = toBoolFlag(versionMetadata?.is_company_form);
    const sendCompanyFormEmail = toBoolFlag(versionMetadata?.send_company_form_email);
    const requiresLogin = toBoolFlag(versionMetadata?.requires_login) || isEventRegistration;
    if (requiresLogin) {
      try {
        const { getStudentFromCookies } = await import("@/lib/auth-student");
        const student = await getStudentFromCookies();
        if (!student) {
          throw new Error("This form requires you to be logged in. Please log in and try again.");
        }
        // Student is authenticated, we'll link them to the response below
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("requires you to be logged in")) {
          throw error;
        }
        console.error('[submitFormResponseAction] Error checking student authentication:', error);
        throw new Error("This form requires you to be logged in. Please log in and try again.");
      }
    }

    // Get student info if logged in (for linking to response and adding user info)
    let student = null;
    try {
      const { getStudentFromCookies } = await import("@/lib/auth-student");
      student = await getStudentFromCookies();
    } catch (error) {
      // Student not logged in - that's fine for forms that don't require login
      console.log('[submitFormResponseAction] Student not logged in (this is fine for non-exclusive forms)');
    }

    // Check max_entries limit before creating the response
    // Always check server-side using server client (works for both authenticated and public submissions)
    if (versionMetadata?.max_entries) {
      const maxEntries = versionMetadata.max_entries as number;
      try {
        // Count using server client - reuse the same client we used to fetch metadata
        const { readItems } = await import("@directus/sdk");
        const responses = await serverClient.request(
          readItems("form_responses" as any, {
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
        const timeZone = process.env.EVENT_TIMEZONE || "Europe/Brussels";
        throw new Error(
          `This form's deadline has passed. The deadline was ${new Date(
            versionMetadata.deadline as string
          ).toLocaleString("en-US", { timeZone })}.`
        );
      }
    }

    // Generate UUID for event registration forms
    let attendantUuid: string | undefined;
    if (isEventRegistration) {
      // Generate a UUID v4
      attendantUuid = crypto.randomUUID();
    }

    // Extract company/submitter info from data if present (for company forms)
    // Do this before the try block so formData is available for email extraction later
    const { _company_id, _submitter_first_name, _submitter_last_name, _submitter_email, ...formData } = data.data;

    // Create form response using server client to ensure it works for both logged-in and non-logged-in users
    // The server client has elevated permissions needed for public form submissions
    const { createItem } = await import("@directus/sdk");
    let response: FormResponse | null = null;
    try {
      // Include student info in the form data if student is logged in
      const enhancedFormData = { ...formData };
      if (student) {
        // For event registration forms, don't add name/surname/email/r-number to metadata
        // They will fill these in the form itself (except university which is a form field)
        if (isEventRegistration) {
          // Only add minimal student metadata for event registration forms
          // University and full_name come from account data for reference
          enhancedFormData._student_id = student.id;
          enhancedFormData._student_username = student.username;
          // Store full_name in metadata for display purposes (even though it's not a form field)
          enhancedFormData._student_full_name = student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.username;
          if (student.university) {
            enhancedFormData._student_university = student.university;
          }
          if (student.university_status) {
            enhancedFormData._student_university_status = student.university_status;
          }
          if (student.organization_status) {
            enhancedFormData._student_organization_status = student.organization_status;
          }
          if (student.in_workinggroup !== undefined) {
            enhancedFormData._student_in_workinggroup = student.in_workinggroup;
          }
        } else {
          // For non-event registration forms, add all student info as before
          enhancedFormData._student_id = student.id;
          enhancedFormData._student_username = student.username;
          enhancedFormData._student_email = student.email;
          enhancedFormData._student_full_name = student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.username;
          if (student.university) {
            enhancedFormData._student_university = student.university;
          }
          if (student.university_status) {
            enhancedFormData._student_university_status = student.university_status;
          }
          if (student.organization_status) {
            enhancedFormData._student_organization_status = student.organization_status;
          }
          if (student.in_workinggroup !== undefined) {
            enhancedFormData._student_in_workinggroup = student.in_workinggroup;
          }
        }
      }

      const responseData = {
        form_version_id: data.form_version_id,
        user_id: data.user_id,
        // student_id column may not exist; student is stored in data._student_id
        data: enhancedFormData, // Include student info in form data (_student_id, etc.)
        attachments: data.attachments,
        ...(attendantUuid ? { attendant_uuid: attendantUuid } : {}),
        ...(data.company_id || _company_id ? { company_id: (data.company_id || _company_id) as string } : {}),
        ...(data.submitter_first_name || _submitter_first_name ? { submitter_first_name: (data.submitter_first_name || _submitter_first_name) as string } : {}),
        ...(data.submitter_last_name || _submitter_last_name ? { submitter_last_name: (data.submitter_last_name || _submitter_last_name) as string } : {}),
        ...(data.submitter_email || _submitter_email ? { submitter_email: (data.submitter_email || _submitter_email) as string } : {}),
      };
      response = await serverClient.request(
        createItem("form_responses" as any, responseData)
      ) as unknown as FormResponse;
    } catch (error) {
      console.error('[submitFormResponseAction] Error creating form response:', error);
      // Re-throw to let the caller handle it
      throw error;
    }

    // Find email field - check common field names (case-insensitive)
    const cleanFormData = formData || {};
    let emailValue: string | undefined;

    // For company forms, prefer submitter_email
    if (isCompanyForm && (data.submitter_email || _submitter_email)) {
      emailValue = (data.submitter_email || _submitter_email) as string;
    } else {
      // Try exact match first
      if (cleanFormData.email) {
        emailValue = cleanFormData.email as string;
      } else {
        // Try case-insensitive search
        const emailKey = Object.keys(cleanFormData).find(
          key => key.toLowerCase() === 'email'
        );
        if (emailKey) {
          emailValue = cleanFormData[emailKey] as string;
        }
      }
    }

    // If this is an event registration form, send confirmation email
    if (response && emailValue && isEventRegistration) {
      // Get form name - prefer from loaded relation, otherwise fetch it using server client
      let formName: string;
      if (typeof formVersion.form_id !== 'string' && formVersion.form_id?.name) {
        // Form relation is already loaded in formVersion
        formName = formVersion.form_id.name;
      } else {
        // Need to fetch form separately using server client
        const formId = typeof formVersion.form_id === 'string' ? formVersion.form_id : formVersion.form_id.id;
        try {
          const form = await serverClient.request(
            readItem("forms" as any, formId, {
              fields: ["name"],
            })
          ) as unknown as { name: string };
          formName = form.name;
        } catch (error) {
          console.warn("Could not get form details, using fallback name:", error);
          formName = 'Event'; // Last resort fallback
        }
      }

      try {
        await sendEventConfirmationEmail({
          to: emailValue,
          firstname: (cleanFormData.firstname as string) || '',
          lastname: (cleanFormData.lastname as string) || '',
          formName: formName,
          subject: (versionMetadata?.event_email_subject as string | undefined) || `${formName} - Registration Confirmation`,
          content: (versionMetadata?.event_email_content as string | undefined) || 'Thank you for registering!',
          eventDate: versionMetadata?.event_date as string | undefined,
          eventEndDate: versionMetadata?.event_end_date as string | undefined,
          eventLocation: versionMetadata?.event_location as string | undefined,
        });
      } catch (emailError) {
        console.error("Error sending event confirmation email:", emailError);
        // Don't throw - email failure shouldn't prevent form submission
      }
    }

    // If this is a company form, send confirmation email (if enabled)
    if (response && emailValue && isCompanyForm && sendCompanyFormEmail) {
      let formName: string;
      if (typeof formVersion.form_id !== 'string' && formVersion.form_id?.name) {
        formName = formVersion.form_id.name;
      } else {
        const formId = typeof formVersion.form_id === 'string' ? formVersion.form_id : formVersion.form_id.id;
        try {
          const form = await serverClient.request(
            readItem("forms" as any, formId, {
              fields: ["name"],
            })
          ) as unknown as { name: string };
          formName = form.name;
        } catch (error) {
          console.warn("Could not get form details, using fallback name:", error);
          formName = 'Form';
        }
      }

      // Get company name
      let companyName = 'Your Company';
      if (_company_id) {
        try {
          // Extract company ID - handle both string and object formats
          const companyId = typeof _company_id === 'string'
            ? _company_id
            : (typeof _company_id === 'object' && _company_id !== null && 'id' in _company_id)
              ? (_company_id as { id: string }).id
              : null;

          if (companyId) {
            const company = await serverClient.request(
              readItem("company" as any, companyId, { fields: ["name"] })
            ) as unknown as { name: string } | null;
            if (company?.name) {
              companyName = company.name;
            }
          }
        } catch (error) {
          console.warn("Could not get company name:", error);
        }
      }

      try {
        // Get user info if available
        const { getUserFromCookies } = await import("@/lib/auth-server");
        const user = await getUserFromCookies();

        await sendCompanyFormConfirmationEmail({
          to: emailValue,
          submitterFirstName: (data.submitter_first_name || _submitter_first_name || (user?.name ? user.name.split(/\s+/)[0] : '')) as string,
          submitterLastName: (data.submitter_last_name || _submitter_last_name || (user?.name ? user.name.split(/\s+/).slice(1).join(' ') : '')) as string,
          formName: formName,
          subject: (versionMetadata?.company_form_email_subject as string | undefined) || `${formName} - Submission Confirmation`,
          content: (versionMetadata?.company_form_email_content as string | undefined) || 'Thank you for your submission!',
          companyName,
        });
      } catch (emailError) {
        console.error("Error sending company form confirmation email:", emailError);
        // Don't throw - email failure shouldn't prevent form submission
      }
    }

    return response;
  } catch (error) {
    console.error("Error submitting form response:", error);
    throw error;
  }
}

export async function fetchLatestCompanyFormResponseAction(formId: string, formVersionId: string, companyId: string) {
  try {
    const { getLatestCompanyFormResponse, getLatestCompanyFormResponseForForm } = await import("@/lib/repos/forms");

    // First try to find a response for the specific version (covers current active version)
    const byVersion = await getLatestCompanyFormResponse(formVersionId, companyId);
    if (byVersion) {
      return byVersion;
    }

    // Fallback: look across all versions of this form (covers responses submitted on older versions)
    if (formId) {
      return await getLatestCompanyFormResponseForForm(formId, companyId);
    }

    return null;
  } catch (error) {
    console.error("[fetchLatestCompanyFormResponseAction] Error fetching latest company form response:", error);
    return null;
  }
}

async function sendCompanyFormConfirmationEmail({
  to,
  submitterFirstName,
  submitterLastName,
  formName,
  subject,
  content,
  companyName,
}: {
  to: string;
  submitterFirstName: string;
  submitterLastName: string;
  formName: string;
  subject: string;
  content: string;
  companyName: string;
}) {
  try {
    const { sendEmail } = await import("@/lib/repos/directus");
    const { generateCompanyFormConfirmationEmailHtml } = await import("@/lib/email-templates");

    // Combine first and last name for display
    const submitterFullName = [submitterFirstName, submitterLastName].filter(Boolean).join(' ') || 'Guest';

    // Replace placeholders in email content
    let personalizedContent = content
      .replace(/{submitter_name}/g, submitterFullName)
      .replace(/{submitter_first_name}/g, submitterFirstName || 'Guest')
      .replace(/{submitter_last_name}/g, submitterLastName || '')
      .replace(/{form_name}/g, formName)
      .replace(/{company_name}/g, companyName || 'Your Company');

    // Only convert newlines if content doesn't appear to be HTML
    if (!personalizedContent.includes('<') || !personalizedContent.includes('>')) {
      personalizedContent = personalizedContent.replace(/\n/g, '<br>');
    }

    const emailHtml = generateCompanyFormConfirmationEmailHtml({
      subject,
      submitterName: submitterFullName,
      personalizedContent,
      formName,
      companyName: companyName || 'Your Company',
    });

    await sendEmail({
      to,
      subject,
      html: emailHtml,
    });
  } catch (error) {
    console.error("Error sending company form confirmation email:", error);
    // Don't throw - email failure shouldn't prevent form submission
  }
}

async function sendEventConfirmationEmail({
  to,
  firstname,
  lastname,
  formName,
  subject,
  content,
  eventDate,
  eventEndDate,
  eventLocation,
}: {
  to: string;
  firstname: string;
  lastname: string;
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

    const fullName = `${firstname} ${lastname}`.trim() || 'Guest';

    // Replace placeholders in email content
    // If content is already HTML (from TipTap), just replace placeholders
    // Otherwise, convert newlines to <br>
    let personalizedContent = content
      .replace(/{firstname}/g, firstname || 'Guest')
      .replace(/{lastname}/g, lastname || '');

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

    // Get Form_uploads folder ID
    const folderId = await getFormUploadsFolderId();

    // Recreate FormData for upload
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    // Add folder parameter if folder ID is available
    if (folderId) {
      uploadFormData.append('folder', folderId);
    }

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

    // Extract file ID and check if folder was set
    const fileId = result?.data?.id || result?.id;
    const uploadedFolderId = result?.data?.folder || result?.folder;

    if (!fileId) {
      throw new Error('Failed to extract file ID from upload result');
    }

    // Update the file to set the folder if needed (fallback in case folder parameter wasn't processed during upload)
    if (folderId && token && uploadedFolderId !== folderId) {
      try {
        const updateUrl = `${directusUrl.replace(/\/$/, '')}/files/${fileId}`;
        const updateResponse = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ folder: folderId }),
        });

        if (!updateResponse.ok) {
          const updateError = await updateResponse.json().catch(() => ({ message: 'Update failed' }));
          console.warn('[uploadFileAction] Failed to update file folder:', updateError);
        }
      } catch (updateError) {
        console.warn('[uploadFileAction] Error updating file folder:', updateError);
        // Don't fail the upload if folder update fails
      }
    }

    return { id: fileId };
  } catch (error) {
    console.error('[uploadFileAction] Error uploading file:', error);
    throw error;
  }
}

export async function fetchCompanyFormsForEventAction(
  eventId: string,
  companyOptionIds: string[],
  requireOptionAssignment = false
) {
  try {
    const { getCompanyFormsForEvent } = await import("@/lib/repos/forms");
    return await getCompanyFormsForEvent(eventId, companyOptionIds, 2, requireOptionAssignment);
  } catch (error) {
    console.error("[fetchCompanyFormsForEventAction] Error fetching company forms:", error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
}

export async function fetchAllCompanyFormsForEventAction(eventId: string) {
  try {
    const { getAllCompanyFormsForEvent } = await import("@/lib/repos/forms");
    return await getAllCompanyFormsForEvent(eventId);
  } catch (error) {
    console.error("[fetchAllCompanyFormsForEventAction] Error:", error);
    return [];
  }
}

export async function fetchCompanyIdsMatchingFormFieldOptionAction(
  formVersionId: string,
  fieldName: string,
  optionValue: string
) {
  try {
    const { getCompanyIdsMatchingFormFieldOption } = await import("@/lib/repos/forms");
    return await getCompanyIdsMatchingFormFieldOption(formVersionId, fieldName, optionValue);
  } catch (error) {
    console.error("[fetchCompanyIdsMatchingFormFieldOptionAction] Error:", error);
    return [];
  }
}

export async function fetchCompanyFormFieldValuesAction(formVersionId: string, fieldName: string) {
  try {
    const { getCompanyFormFieldValues } = await import("@/lib/repos/forms");
    return await getCompanyFormFieldValues(formVersionId, fieldName);
  } catch (error) {
    console.error("[fetchCompanyFormFieldValuesAction] Error:", error);
    return {};
  }
}

export async function fetchCompanyFormBySlugAndEventAction(eventId: string, slug: string) {
  try {
    const { getCompanyFormBySlugAndEvent } = await import("@/lib/repos/forms");
    return await getCompanyFormBySlugAndEvent(eventId, slug);
  } catch (error) {
    console.error("[fetchCompanyFormBySlugAndEventAction] Error fetching company form:", error);
    return null;
  }
}

export async function checkCompanyFormCompletionAction(companyId: string, formVersionIds: string[]) {
  try {
    const { checkCompanyFormCompletion } = await import("@/lib/repos/forms");
    return await checkCompanyFormCompletion(companyId, formVersionIds);
  } catch (error) {
    console.error("[checkCompanyFormCompletionAction] Error checking form completion:", error);
    return new Set<string>();
  }
}

export async function checkCompanyFormCompletionBatchAction(
  companyIds: string[],
  formVersionIds: string[]
): Promise<Map<string, Set<string>>> {
  try {
    const { checkCompanyFormCompletionBatch } = await import("@/lib/repos/forms");
    return await checkCompanyFormCompletionBatch(companyIds, formVersionIds);
  } catch (error) {
    console.error("[checkCompanyFormCompletionBatchAction] Error:", error);
    return new Map();
  }
}

/** Batch check: has company completed ANY version of these forms? Returns Map<companyId, Set<formId>> */
export async function checkCompanyFormCompletionByFormIdsBatchAction(
  companyIds: string[],
  formIds: string[]
): Promise<Map<string, Set<string>>> {
  try {
    const { checkCompanyFormCompletionByFormIdsBatch } = await import("@/lib/repos/forms");
    return await checkCompanyFormCompletionByFormIdsBatch(companyIds, formIds);
  } catch (error) {
    console.error("[checkCompanyFormCompletionByFormIdsBatchAction] Error:", error);
    return new Map();
  }
}

export async function checkCompanyFormCompletionByFormIdsAction(companyId: string, formIds: string[]) {
  try {
    const { checkCompanyFormCompletionByFormIds } = await import("@/lib/repos/forms");
    return await checkCompanyFormCompletionByFormIds(companyId, formIds);
  } catch (error) {
    console.error("[checkCompanyFormCompletionByFormIdsAction] Error checking form completion:", error);
    return new Set<string>();
  }
}

/** Batch check form completion with compulsory support. For compulsory forms, company must complete this version or newer. */
export async function checkCompanyFormCompletionBatchWithCompulsoryAction(
  companyIds: string[],
  forms: Array<{ formId: string; formVersionId: string; versionNumber?: number; isCompulsory?: boolean }>
): Promise<Map<string, Set<string>>> {
  try {
    const { checkCompanyFormCompletionBatchWithCompulsory } = await import("@/lib/repos/forms");
    return await checkCompanyFormCompletionBatchWithCompulsory(companyIds, forms);
  } catch (error) {
    console.error("[checkCompanyFormCompletionBatchWithCompulsoryAction] Error:", error);
    return new Map();
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

    // Check if form requires login (event registration forms always require login) and if student is authenticated
    let requiresLogin = false;
    let isAuthenticated = false;
    let studentEmail: string | undefined = undefined;
    let studentId: string | undefined = undefined;
    const toBoolFlag = (v: unknown): boolean => {
      if (v === true) return true;
      if (v === false) return false;
      if (v === 1 || v === "1") return true;
      if (v === 0 || v === "0") return false;
      if (typeof v === "string") {
        const s = v.trim().toLowerCase();
        if (s === "true" || s === "yes" || s === "y") return true;
        if (s === "false" || s === "no" || s === "n" || s === "") return false;
      }
      return false;
    };

    const isEventRegistration = toBoolFlag(versionMetadata?.is_event_registration);
    if (toBoolFlag(versionMetadata?.requires_login) || isEventRegistration) {
      requiresLogin = true;
      try {
        const { getStudentFromCookies } = await import("@/lib/auth-student");
        const student = await getStudentFromCookies();
        isAuthenticated = !!student;
        if (student?.email) studentEmail = student.email;
        if (student?.id) studentId = student.id;
      } catch (error) {
        console.error('[fetchPublicFormBySlugAction] Error checking student authentication:', error);
        isAuthenticated = false;
      }
    } else {
      // Still check for student (e.g. prerequisite form from matching software) to support version-upgrade flow
      try {
        const { getStudentFromCookies } = await import("@/lib/auth-student");
        const student = await getStudentFromCookies();
        if (student?.id) studentId = student.id;
      } catch {
        // Ignore
      }
    }

    // If student is logged in, fetch their existing response (any version) for prefill/version-upgrade
    let existingResponse: { form_version_id: string; data: Record<string, unknown> } | null = null;
    if (studentId) {
      try {
        const { getStudentLatestFormResponseForForm } = await import("@/lib/repos/forms");
        const { readItems } = await import("@directus/sdk");
        const { getServerDirectusClient } = await import("@/lib/directus");
        let versionIds = form.form_versions?.map((v: { id: string }) => v.id) ?? [];
        // Fallback: public client may not return form_versions; fetch via server client
        if (versionIds.length === 0 && form.id) {
          const serverClient = await getServerDirectusClient();
          const versions = await serverClient.request(
            readItems("form_versions" as any, {
              fields: ["id"],
              filter: { form_id: { _eq: form.id } },
            })
          ) as unknown as Array<{ id: string }>;
          versionIds = versions.map((v) => v.id);
        }
        if (versionIds.length > 0) {
          const resp = await getStudentLatestFormResponseForForm(studentId, versionIds);
          if (resp) {
            existingResponse = { form_version_id: resp.form_version_id, data: resp.data ?? {} };
          }
        }
      } catch (error) {
        console.error('[fetchPublicFormBySlugAction] Error fetching existing response:', error);
      }
    }

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
          readItems("form_responses" as any, {
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
      requiresLogin, // Indicates if form requires login
      isAuthenticated, // Indicates if user is authenticated (only relevant if requiresLogin is true)
      studentEmail, // Student email if authenticated (for pre-filling form fields)
      existingResponse, // Student's latest response (any version) - for version-upgrade flow
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


