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
import { uploadFile } from "@/lib/file-storage";
import { getCompanyById } from "@/lib/repos/company";
import {
  FORM_SUBMIT_SESSION_TIMEOUT_MESSAGE,
  isSessionTokenExpiredError,
} from "@/lib/form-submit-errors";
import { requireAdminUser } from "@/lib/auth-server";

// ===================== FORM ACTIONS =====================

export async function fetchFormsAction(opts?: {
  search?: string;
  limit?: number;
  page?: number;
  sort?: string;
}) {
  try {
    await requireAdminUser();
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
    await requireAdminUser();
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
    await requireAdminUser();
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
    await requireAdminUser();
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
    await requireAdminUser();
    return await deleteForm(id);
  } catch (error) {
    console.error("Error deleting form:", error);
    throw error;
  }
}

// ===================== FORM VERSION ACTIONS =====================

export async function fetchFormVersionsAction(formId: string) {
  try {
    await requireAdminUser();
    return await listFormVersions(formId);
  } catch (error) {
    console.error("Error fetching form versions:", error);
    throw error;
  }
}

export async function fetchFormVersionByIdAction(id: string) {
  try {
    await requireAdminUser();
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
    await requireAdminUser();
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
    await requireAdminUser();
    return await updateFormVersion(id, data);
  } catch (error) {
    console.error("Error updating form version:", error);
    throw error;
  }
}

export async function deleteFormVersionAction(id: string) {
  try {
    await requireAdminUser();
    return await deleteFormVersion(id);
  } catch (error) {
    console.error("Error deleting form version:", error);
    throw error;
  }
}

export async function setActiveVersionAction(versionId: string) {
  try {
    await requireAdminUser();
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
    await requireAdminUser();
    return await listFormResponses(formVersionId, opts);
  } catch (error) {
    console.error("Error fetching form responses:", error);
    throw error;
  }
}

export async function fetchFormResponsesTotalCountAction(formVersionId: string) {
  try {
    await requireAdminUser();
    const { getFormResponsesTotalCount } = await import("@/lib/repos/forms");
    return await getFormResponsesTotalCount(formVersionId);
  } catch (error) {
    console.error("Error fetching form responses total count:", error);
    return 0;
  }
}

export async function fetchAllFormResponsesAction(formVersionId: string) {
  try {
    await requireAdminUser();
    return await listFormResponses(formVersionId, { limit: -1 });
  } catch (error) {
    console.error("Error fetching all form responses:", error);
    throw error;
  }
}

export async function fetchFirstFormResponseAction(formVersionId: string) {
  try {
    await requireAdminUser();
    const { getFirstFormResponse } = await import("@/lib/repos/forms");
    return await getFirstFormResponse(formVersionId);
  } catch (error) {
    console.error("Error fetching first form response:", error);
    return null;
  }
}

export async function fetchLatestFormResponseAction(formVersionId: string) {
  try {
    await requireAdminUser();
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
    await requireAdminUser();
    const { listFormResponsesForAllVersions } = await import("@/lib/repos/forms");
    return await listFormResponsesForAllVersions(formId, opts);
  } catch (error) {
    console.error("Error fetching form responses for all versions:", error);
    throw error;
  }
}

export async function fetchFormResponsesTotalCountForAllVersionsAction(formId: string) {
  try {
    await requireAdminUser();
    const { getFormResponsesTotalCountForAllVersions } = await import("@/lib/repos/forms");
    return await getFormResponsesTotalCountForAllVersions(formId);
  } catch (error) {
    console.error("Error fetching form responses total count for all versions:", error);
    return 0;
  }
}

export async function fetchFirstFormResponseForAllVersionsAction(formId: string) {
  try {
    await requireAdminUser();
    const { getFirstFormResponseForAllVersions } = await import("@/lib/repos/forms");
    return await getFirstFormResponseForAllVersions(formId);
  } catch (error) {
    console.error("Error fetching first form response for all versions:", error);
    return null;
  }
}

export async function fetchLatestFormResponseForAllVersionsAction(formId: string) {
  try {
    await requireAdminUser();
    const { getLatestFormResponseForAllVersions } = await import("@/lib/repos/forms");
    return await getLatestFormResponseForAllVersions(formId);
  } catch (error) {
    console.error("Error fetching latest form response for all versions:", error);
    return null;
  }
}

export async function fetchAllFormResponsesForAllVersionsAction(formId: string) {
  try {
    await requireAdminUser();
    const { listFormResponsesForAllVersions } = await import("@/lib/repos/forms");
    return await listFormResponsesForAllVersions(formId, { limit: -1 });
  } catch (error) {
    console.error("Error fetching all form responses for all versions:", error);
    throw error;
  }
}

export async function fetchFormResponseByIdAction(id: string) {
  try {
    await requireAdminUser();
    return await getFormResponseById(id);
  } catch (error) {
    console.error("Error fetching form response:", error);
    throw error;
  }
}

export async function deleteFormResponseAction(id: string) {
  try {
    await requireAdminUser();
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
    await requireAdminUser();
    return await updateFormResponse(id, data);
  } catch (error) {
    console.error("Error updating form response:", error);
    throw error;
  }
}

export async function initializeAttendantUuidsAction(formId?: string) {
  try {
    await requireAdminUser();
    const { initializeAttendantUuids } = await import("@/lib/repos/forms");
    return await initializeAttendantUuids(formId);
  } catch (error) {
    console.error("Error initializing attendant UUIDs:", error);
    throw error;
  }
}

export async function archiveDuplicateFormResponsesAction(formId: string) {
  try {
    await requireAdminUser();
    const { archiveDuplicateResponsesForForm } = await import("@/lib/repos/forms");
    return await archiveDuplicateResponsesForForm(formId);
  } catch (error) {
    console.error("Error archiving duplicate form responses:", error);
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
    const formVersion = await getFormVersionById(data.form_version_id);
    if (!formVersion) throw new Error("Form version not found");

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
        const currentCount = await countFormVersionResponses(data.form_version_id);

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

    let attendantUuid: string | undefined;

    // Extract company/submitter info from data if present (for company forms)
    // Do this before the try block so formData is available for email extraction later
    const { _company_id, _submitter_first_name, _submitter_last_name, _submitter_email, ...formData } = data.data;
    if (isCompanyForm) {
      const { getUserFromCookies } = await import("@/lib/auth-server");
      const user = await getUserFromCookies();
      if (!user?.company) {
        throw new Error("This company form requires you to be logged in.");
      }
      const requestedCompanyId = data.company_id || (_company_id as string | undefined);
      if (requestedCompanyId && requestedCompanyId !== user.company.id) {
        throw new Error("Unauthorized company form submission.");
      }
      data.company_id = user.company.id;
      data.user_id = user.id;
    }

    // Check if this student already has a non-archived response for this form.
    // If so, we UPDATE the existing response instead of creating a new one to preserve the attendant_uuid.
    let existingResponseId: string | null = null;
    let existingAttendantUuid: string | null = null;
    if (student) {
      const formId = typeof formVersion.form_id === "string" ? formVersion.form_id : (formVersion.form_id as { id: string }).id;
      const { getStudentLatestFormResponseForForm, listFormVersionsForServer } = await import("@/lib/repos/forms");
      const allVersions = await listFormVersionsForServer(formId);
      const versionIds = allVersions.map((v) => v.id);
      if (versionIds.length > 0) {
        const existing = await getStudentLatestFormResponseForForm(student.id, versionIds);
        if (existing) {
          existingResponseId = existing.id;
          existingAttendantUuid = existing.attendant_uuid ?? null;
        }
      }
    }

    const isUpdate = !!existingResponseId;

    // Only generate a new attendant UUID if creating a new response for an event registration form
    if (isEventRegistration && !isUpdate) {
      attendantUuid = crypto.randomUUID();
    } else if (isEventRegistration && isUpdate) {
      // Reuse the existing attendant UUID
      attendantUuid = existingAttendantUuid ?? undefined;
    }

    let response: FormResponse | null = null;
    try {
      // Include student info in the form data if student is logged in
      const enhancedFormData = { ...formData };
      if (student) {
        if (isEventRegistration) {
          enhancedFormData._student_id = student.id;
          enhancedFormData._student_username = student.username;
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

      if (isUpdate && existingResponseId) {
        const updateData: Record<string, unknown> = {
          form_version_id: data.form_version_id,
          data: enhancedFormData,
          ...(data.attachments ? { attachments: data.attachments } : {}),
          ...(data.company_id || _company_id ? { company_id: (data.company_id || _company_id) as string } : {}),
          ...(data.submitter_first_name || _submitter_first_name ? { submitter_first_name: (data.submitter_first_name || _submitter_first_name) as string } : {}),
          ...(data.submitter_last_name || _submitter_last_name ? { submitter_last_name: (data.submitter_last_name || _submitter_last_name) as string } : {}),
          ...(data.submitter_email || _submitter_email ? { submitter_email: (data.submitter_email || _submitter_email) as string } : {}),
        };
        response = await updateFormResponse(existingResponseId, updateData);
      } else {
        // Create a new response
        const responseData = {
          form_version_id: data.form_version_id,
          user_id: data.user_id,
          data: enhancedFormData,
          attachments: data.attachments,
          ...(attendantUuid ? { attendant_uuid: attendantUuid } : {}),
          ...(data.company_id || _company_id ? { company_id: (data.company_id || _company_id) as string } : {}),
          ...(data.submitter_first_name || _submitter_first_name ? { submitter_first_name: (data.submitter_first_name || _submitter_first_name) as string } : {}),
          ...(data.submitter_last_name || _submitter_last_name ? { submitter_last_name: (data.submitter_last_name || _submitter_last_name) as string } : {}),
          ...(data.submitter_email || _submitter_email ? { submitter_email: (data.submitter_email || _submitter_email) as string } : {}),
        };
        response = await createFormResponse(responseData);
      }
    } catch (error) {
      console.error('[submitFormResponseAction] Error saving form response:', error);
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

    // If this is an event registration form, send confirmation email (only for new submissions, not updates)
    if (response && emailValue && isEventRegistration && !isUpdate) {
      // Get form name - prefer from loaded relation, otherwise fetch it using server client
      let formName: string;
      if (typeof formVersion.form_id !== 'string' && formVersion.form_id?.name) {
        // Form relation is already loaded in formVersion
        formName = formVersion.form_id.name;
      } else {
        // Need to fetch form separately using server client
        const formId = typeof formVersion.form_id === 'string' ? formVersion.form_id : formVersion.form_id.id;
        try {
          const form = await getFormById(formId);
          formName = form?.name || "Event";
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
          attendantUuid,
        });
        if (response?.id) {
          try {
            const existingData = (response as any).data || {};
            await updateFormResponse(String(response.id), {
              data: { ...existingData, _qr_email_sent_at: new Date().toISOString() },
            });
          } catch {
            // Non-critical: tracking update shouldn't affect anything
          }
        }
      } catch (emailError) {
        console.error("Error sending event confirmation email:", emailError);
        // Don't throw - email failure shouldn't prevent form submission
      }
    }

    // EventSight integration (only for new registrations, fail silently like emails)
    if (response && isEventRegistration && !isUpdate) {
      try {
        const { sendEventSightSubscription } = await import("@/lib/eventsight");
        await sendEventSightSubscription(versionMetadata?.event_id as string | undefined, {
          formData: cleanFormData,
          attendantUuid,
          student,
        });
      } catch (eventsightError) {
        console.error("Error sending EventSight subscription:", eventsightError);
      }
    }

    // If this is a company form, send confirmation email (if enabled, only for new submissions)
    if (response && emailValue && isCompanyForm && sendCompanyFormEmail && !isUpdate) {
      let formName: string;
      if (typeof formVersion.form_id !== 'string' && formVersion.form_id?.name) {
        formName = formVersion.form_id.name;
      } else {
        const formId = typeof formVersion.form_id === 'string' ? formVersion.form_id : formVersion.form_id.id;
        try {
          const form = await getFormById(formId);
          formName = form?.name || "Form";
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
            const company = await getCompanyById(companyId);
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
    if (isSessionTokenExpiredError(error)) {
      throw new Error(FORM_SUBMIT_SESSION_TIMEOUT_MESSAGE);
    }
    throw error;
  }
}

export async function fetchLatestCompanyFormResponseAction(formId: string, formVersionId: string, companyId: string) {
  try {
    const { getUserFromCookies } = await import("@/lib/auth-server");
    const user = await getUserFromCookies();
    if (!user?.company || user.company.id !== companyId) return null;
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
    const { sendEmail } = await import("@/lib/email");
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
  attendantUuid,
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
  attendantUuid?: string;
}) {
  try {
    const { sendEmail } = await import("@/lib/email");
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

    const formDomain = process.env.NEXT_PUBLIC_FORM_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const attendantLink = attendantUuid ? `${formDomain}/attendant/${attendantUuid}` : undefined;

    const emailHtml = generateEventConfirmationEmailHtml({
      subject,
      fullName,
      personalizedContent,
      eventDate: eventDate || undefined,
      eventEndDate: eventEndDate || undefined,
      eventLocation: eventLocation || undefined,
      formName,
      attendantLink,
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

export async function uploadFileAction(formData: FormData) {
  try {
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("No file provided");
    return { id: await uploadFile(file) };
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

export async function fetchCompanyFormFieldValuesFromFormAction(formId: string, fieldName: string) {
  try {
    const { getCompanyFormFieldValuesFromForm } = await import("@/lib/repos/forms");
    return await getCompanyFormFieldValuesFromForm(formId, fieldName);
  } catch (error) {
    console.error("[fetchCompanyFormFieldValuesFromFormAction] Error:", error);
    return {};
  }
}

export async function fetchFloorplanCategoryOptionsAction(
  categoryFields: Array<{ formId: string; formVersionId: string; fieldName: string }>
) {
  try {
    const { getFloorplanCategoryOptions } = await import("@/lib/repos/forms");
    return await getFloorplanCategoryOptions(categoryFields);
  } catch (error) {
    console.error("[fetchFloorplanCategoryOptionsAction] Error:", error);
    return { groups: [] };
  }
}

export async function fetchCompanyIdsMatchingFloorplanCategoryAction(
  categoryFields: Array<{ formId: string; formVersionId: string; fieldName: string }>,
  selectedValues: string[]
) {
  try {
    const { getCompanyIdsMatchingFloorplanCategory } = await import("@/lib/repos/forms");
    return await getCompanyIdsMatchingFloorplanCategory(categoryFields, selectedValues);
  } catch (error) {
    console.error("[fetchCompanyIdsMatchingFloorplanCategoryAction] Error:", error);
    return [];
  }
}

export async function fetchCompanyMasterDegreesFromFormAction(
  categoryFields: Array<{ formId: string; formVersionId: string; fieldName: string }>,
  companyId: string
) {
  try {
    const { getCompanyMasterDegreesFromForm } = await import("@/lib/repos/forms");
    return await getCompanyMasterDegreesFromForm(categoryFields, companyId);
  } catch (error) {
    console.error("[fetchCompanyMasterDegreesFromFormAction] Error:", error);
    return [];
  }
}

export async function fetchCompanyMasterDegreesFromFormBatchAction(
  categoryFields: Array<{ formId: string; formVersionId: string; fieldName: string }>,
  companyIds: string[]
): Promise<Record<string, string[]>> {
  try {
    const { getCompanyMasterDegreesFromFormBatch } = await import("@/lib/repos/forms");
    return await getCompanyMasterDegreesFromFormBatch(categoryFields, companyIds);
  } catch (error) {
    console.error("[fetchCompanyMasterDegreesFromFormBatchAction] Error:", error);
    return {};
  }
}

export async function migrateFormResponsesMasterDegreesAction(formId: string) {
  try {
    const { migrateFormResponsesMasterDegrees } = await import("@/lib/repos/forms");
    return await migrateFormResponsesMasterDegrees(formId);
  } catch (error) {
    console.error("[migrateFormResponsesMasterDegreesAction] Error:", error);
    throw error;
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

export async function getStudentFormResponseDataForEventAction(eventId: string, studentIds: string[]) {
  try {
    const { getStudentFormResponseDataForEvent } = await import("@/lib/repos/forms");
    return await getStudentFormResponseDataForEvent(eventId, studentIds);
  } catch (error) {
    console.error("[getStudentFormResponseDataForEventAction] Error:", error);
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
    let existingResponse: { id: string; form_version_id: string; data: Record<string, unknown>; attendant_uuid?: string } | null = null;
    if (studentId) {
      try {
        const { getStudentLatestFormResponseForForm } = await import("@/lib/repos/forms");
        let versionIds = form.form_versions?.map((v: { id: string }) => v.id) ?? [];
        if (versionIds.length === 0 && form.id) {
          const versions = await listFormVersions(form.id);
          versionIds = versions.map((v) => v.id);
        }
        if (versionIds.length > 0) {
          const resp = await getStudentLatestFormResponseForForm(studentId, versionIds);
          if (resp) {
            existingResponse = { id: resp.id, form_version_id: resp.form_version_id, data: resp.data ?? {}, attendant_uuid: resp.attendant_uuid };
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
        const currentCount = await countFormVersionResponses(activeVersion.id);
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
    });
    return null;
  }
}
