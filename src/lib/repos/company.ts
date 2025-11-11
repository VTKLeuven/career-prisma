// lib/repos/company.ts
"use server"

import { readItems, readItem, createItem, updateItem } from "@directus/sdk";
import { getDirectusWithToken, directus } from "@/lib/directus";
import type { Company } from "@/lib/schema";


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
          "options.career_event_option_id.id",
          "options.career_event_option_id.name",
          "options.career_event_option_id.description",
          "options.career_event_option_id.price",
          "options.career_event_option_id.event.*",
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

export async function getCompanyById(id: string, usePublic = false) {
  try {
    const client = usePublic ? directus : await getDirectusWithToken();
    if (!client) return null;
    
    return client.request(
      readItem("company", id, {
        fields: [
          "*",
          "page_image",
          "representatives.*",
          "category.master_id.*",
          "options.career_event_option_id.id",
          "options.career_event_option_id.name",
          "options.career_event_option_id.description",
          "options.career_event_option_id.price",
          "options.career_event_option_id.event.*",
        ],
      })
    ) as unknown as Company;
  } catch (error: any) {
    // Handle FORBIDDEN errors gracefully
    if (error?.errors?.[0]?.extensions?.code === "FORBIDDEN" || 
        error?.message?.includes("FORBIDDEN") ||
        error?.message?.includes("permission")) {
      // Log once but don't throw - return null to indicate the company couldn't be accessed
      if (process.env.NODE_ENV === "development") {
        console.warn(`[getCompanyById] Permission denied for company ${id}:`, error.message || "You don't have permission to access this.");
      }
      return null;
    }
    
    // For other errors, log and return null
    console.error(`[getCompanyById] Error fetching company ${id}:`, error);
    return null;
  }
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
