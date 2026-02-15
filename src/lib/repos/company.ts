// lib/repos/company.ts
"use server"

import { readItems, readItem, createItem, updateItem } from "@directus/sdk";
import { getDirectusWithToken, directus } from "@/lib/directus";
import type { Company } from "@/lib/schema";
import { getServerDirectusClient } from "@/lib/directus";


export async function listCompanies(opts?: {
  search?: string;
  limit?: number;
  page?: number;        // 1-based
  sort?: string;        // e.g. "-date_created" or "name"
  usePublic?: boolean;  // Use public client for unauthenticated access
}) {
  try {
    const { usePublic = false, search, limit = 25, page = 1, sort = "name" } = opts ?? {};
    
    // Use public client if requested, otherwise try authenticated
    const client = usePublic ? directus : await getDirectusWithToken();
    if (!client) return null;

    return client.request(
      readItems("company", {
        fields: [
          "*",
          "representatives.*",
          "category.master_id.*",
          "salesperson.id",
          "salesperson.first_name",
          "salesperson.last_name",
          "options.career_event_option_id.*",
          "options.career_event_option_id.*.*", // Get all nested fields including events junction table
          "options.career_event_option_id.*.*.*", // Get deeply nested fields
          "options.career_event_option_id.sub_options.*", // Get sub_options
        ],
        limit,
        page,
        sort,
        ...(search
          ? { search } // Directus full-text search (if enabled)
          : {}),
      })
    ) as unknown as Company[];
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getCompanyById(id: string, usePublic = false, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const client = usePublic ? directus : await getDirectusWithToken();
      if (!client) return null;
      
      return await client.request(
        readItem("company", id, {
          fields: [
            "*",
            "page_image",
            "representatives.*",
            "category.master_id.*",
            "options.career_event_option_id.*",
            "options.career_event_option_id.*.*", // Get all nested fields including events junction table
            "options.career_event_option_id.*.*.*", // Get deeply nested fields
            "options.career_event_option_id.sub_options.*", // Get sub_options
          ],
        })
      ) as unknown as Company;
    } catch (error: any) {
      // Handle FORBIDDEN errors gracefully - don't retry these
      if (error?.errors?.[0]?.extensions?.code === "FORBIDDEN" || 
          error?.message?.includes("FORBIDDEN") ||
          error?.message?.includes("permission")) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[getCompanyById] Permission denied for company ${id}:`, error.message || "You don't have permission to access this.");
        }
        return null;
      }
      
      // For network errors, retry with exponential backoff
      const isNetworkError = error?.message?.includes("fetch failed") || 
                            error?.message?.includes("network") ||
                            error?.message?.includes("ECONNREFUSED") ||
                            error?.message?.includes("ETIMEDOUT");
      
      if (isNetworkError && attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5 seconds
        console.warn(`[getCompanyById] Network error (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For other errors or final retry, log and return null
      console.error(`[getCompanyById] Error fetching company ${id}:`, error);
      return null;
    }
  }
  return null;
}

// Optional create/update helpers (if your role allows it)
export async function createCompany(payload: Partial<Company>) {
  const directus = await getDirectusWithToken();
  if (!directus) return null;

  return directus.request(createItem("company", payload));
}

export async function updateCompany(id: string, payload: Partial<Company>) {
  const directus = await getDirectusWithToken();
  if (!directus) return null;

  return directus.request(updateItem("company", id, payload));
}

/**
 * Get companies registered for a specific event
 * Companies are considered registered if they have options linked to the event
 */
export async function getCompaniesForEvent(eventId: string, usePublic = false) {
  try {
    const client = usePublic ? directus : await getDirectusWithToken();
    if (!client) return [];

    // For public access (company form page), we don't need salesperson field
    // Only fetch it for admin views (usePublic = false)
    const fields = usePublic 
      ? [
          "id",
          "name",
          "options.career_event_option_id.id",
          "options.career_event_option_id.*",
          "options.career_event_option_id.events.career_event_id.id",
          "options.career_event_option_id.events.career_event_id.*",
          "options.career_event_option_id.event.id", // Backward compatibility
          "options.career_event_option_id.event.*",
        ]
      : [
          "id",
          "name",
          "status",
          "salesperson.id",
          "salesperson.first_name",
          "salesperson.last_name",
          "options.career_event_option_id.id",
          "options.career_event_option_id.*",
          "options.career_event_option_id.events.career_event_id.id",
          "options.career_event_option_id.events.career_event_id.*",
          "options.career_event_option_id.event.id", // Backward compatibility
          "options.career_event_option_id.event.*",
        ];

    const companies = await client.request(
      readItems("company", {
        fields,
        limit: -1,
      })
    ) as unknown as Company[];

    console.log(`[getCompaniesForEvent] Fetched ${companies.length} companies for event ${eventId}`);

    // Filter companies that have options linked to this event
    const registeredCompanies = companies.filter((company) => {
      const options = company.options || [];
      
      return options.some((opt) => {
        // Handle junction table format
        let optionWithEvents: any = null;
        if (opt && typeof opt === 'object' && 'career_event_option_id' in opt) {
          optionWithEvents = (opt as any).career_event_option_id;
        } else {
          optionWithEvents = opt;
        }
        
        if (!optionWithEvents) return false;
        
        // Check events array
        if (optionWithEvents.events && Array.isArray(optionWithEvents.events)) {
          return optionWithEvents.events.some((eventRef: any) => {
            const event = typeof eventRef === 'object' && 'career_event_id' in eventRef
              ? eventRef.career_event_id
              : eventRef;
            const eventIdToCheck = typeof event === 'string' ? event : event?.id;
            return String(eventIdToCheck) === String(eventId);
          });
        }
        
        // Check single event (backward compatibility)
        if (optionWithEvents.event) {
          const event = optionWithEvents.event;
          const eventIdToCheck = typeof event === 'string' ? event : event?.id;
          return String(eventIdToCheck) === String(eventId);
        }
        
        return false;
      });
    });

    console.log(`[getCompaniesForEvent] Found ${registeredCompanies.length} companies registered for event ${eventId}`);

    // Return full company objects (not just id and name)
    return registeredCompanies;
  } catch (error) {
    console.error("[getCompaniesForEvent] Error fetching companies for event:", error);
    return [];
  }
}
