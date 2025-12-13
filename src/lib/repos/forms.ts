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
        fields: ["*", "user_id.name", "user_id.email", "form_version_id.form_id.name", "company_id.name", "company_id.id"],
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

export async function getCompanyFormsForEvent(eventId: string, companyOptionIds: string[]) {
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

    console.log(`[getCompanyFormsForEvent] Found ${forms.length} active forms, looking for event ${eventId}`);

    // Filter for company forms linked to this event
    const companyForms = forms
      .map((form) => {
        const activeVersion = form.form_versions?.find((v) => v.is_active);
        if (!activeVersion) return null;
        
        const metadata = (activeVersion as FormVersion & { metadata?: FormMetadata })?.metadata;
        
        if (!metadata?.is_company_form) return null;
        
        // Debug logging
        console.log(`[getCompanyFormsForEvent] Checking form "${form.name}":`, {
          formId: form.id,
          metadataEventId: metadata.event_id,
          searchEventId: eventId,
          eventIdType: typeof metadata.event_id,
          searchEventIdType: typeof eventId,
          matchesEvent: String(metadata.event_id) === String(eventId),
          optionIds: metadata.option_ids,
        });
        
        // Compare as strings to handle type mismatches
        if (String(metadata.event_id) !== String(eventId)) return null;
        
        // Check if company has any of the required options
        const requiredOptionIds = metadata.option_ids || [];
        if (requiredOptionIds.length > 0) {
          // Compare as strings to handle type mismatches
          const hasRequiredOption = requiredOptionIds.some((optionId) =>
            companyOptionIds.some((companyOptionId) => String(companyOptionId) === String(optionId))
          );
          console.log(`[getCompanyFormsForEvent] Form "${form.name}" requires options:`, {
            required: requiredOptionIds,
            companyHas: companyOptionIds,
            matches: hasRequiredOption,
          });
          if (!hasRequiredOption) return null;
        } else {
          console.log(`[getCompanyFormsForEvent] Form "${form.name}" has no required options, showing to all companies`);
        }
        
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
      })
      .filter((form): form is NonNullable<typeof form> => form !== null);

    console.log(`[getCompanyFormsForEvent] Returning ${companyForms.length} company forms for event ${eventId}`);
    return companyForms;
  } catch (error) {
    console.error("[getCompanyFormsForEvent] Error fetching company forms:", error);
    throw error;
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
    const activeVersion = form.form_versions?.find((v) => v.is_active);
    if (!activeVersion) return null;
    
    const metadata = (activeVersion as FormVersion & { metadata?: FormMetadata })?.metadata;
    if (!metadata?.is_company_form) return null;
    if (metadata.event_id !== eventId) return null;
    
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

