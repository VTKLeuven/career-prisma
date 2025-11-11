// lib/repos/option.ts
"use server"

import { readItems } from "@directus/sdk";
import { getDirectusWithToken } from "@/lib/directus";
import type { CareerEventOption } from "@/lib/schema";

/**
 * Fetch all career event options directly from the career_event_option collection
 * This is more reliable than fetching through events when dealing with many-to-many relationships
 * 
 * In Directus, many-to-many relationships use junction tables. The field structure depends on
 * how the relationship is configured. Common patterns:
 * - events.* (if the junction table field is named "events")
 * - events.career_event_id.* (if the junction table has a foreign key field)
 */
export async function listCareerEventOptions(opts?: {
  limit?: number;
}) {
  try {
    const { limit = 1000 } = opts ?? {};
    const client = await getDirectusWithToken();
    if (!client) {
      console.error("No Directus client available");
      return null;
    }

    // Use wildcard to get all fields - this is most reliable for many-to-many relationships
    // Directus will automatically include junction table data when using wildcards
    const result = await client.request(
      readItems("career_event_option", {
        fields: ["*", "*.*", "*.*.*"], // Get all fields including nested relationships
        limit,
      })
    ) as unknown as CareerEventOption[] | null;

    return result;
  } catch (error) {
    console.error("Error fetching career event options:", error);
    // If the query fails due to field name issues, try with minimal fields
    try {
      const client = await getDirectusWithToken();
      if (!client) return null;
      
      const { limit: fallbackLimit = 1000 } = opts ?? {};
      return client.request(
        readItems("career_event_option", {
          fields: ["*", "*.*"], // Use wildcard to get all fields
          limit: fallbackLimit,
        })
      ) as unknown as CareerEventOption[] | null;
    } catch (fallbackError) {
      console.error("Fallback query also failed:", fallbackError);
      return null;
    }
  }
}

