// lib/repos/option.ts
"use server"

import { readItems } from "@directus/sdk";
import { getDirectusWithToken, directus } from "@/lib/directus";
import type { CareerEventOption, CareerSubOption } from "@/lib/schema";

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
        fields: ["*", "*.*", "*.*.*", "sub_options.*"], // Get all fields including nested relationships and sub_options
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
          fields: ["*", "*.*", "sub_options.*"], // Use wildcard to get all fields including sub_options
          limit: fallbackLimit,
        })
      ) as unknown as CareerEventOption[] | null;
    } catch (fallbackError) {
      console.error("Fallback query also failed:", fallbackError);
      return null;
    }
  }
}

/**
 * Fetch CV Book sub-option directly from career_sub_option collection
 */
export async function getCVBookSubOption(): Promise<CareerSubOption | null> {
  try {
    const client = await getDirectusWithToken();
    if (!client) {
      // Try public client as fallback
      const publicClient = directus;
      if (!publicClient) {
        console.error("[getCVBookSubOption] No Directus client available");
        return null;
      }
      
      try {
        const result = await publicClient.request(
          readItems("career_sub_option", {
            fields: ["*"],
            filter: {
              name: {
                _eq: "CV Book"
              }
            },
            limit: 1,
          })
        ) as unknown as CareerSubOption[] | null;
        
        // Handle both array and { data: [...] } formats
        const items = Array.isArray(result) ? result : (result as any)?.data;
        if (items && items.length > 0) {
          console.log("[getCVBookSubOption] Found CV Book sub-option (public client):", items[0]);
          return items[0];
        }
        console.warn("[getCVBookSubOption] No CV Book sub-option found (public client)");
        return null;
      } catch (publicError) {
        console.error("[getCVBookSubOption] Error with public client:", publicError);
        return null;
      }
    }

    try {
      const result = await client.request(
        readItems("career_sub_option", {
          fields: ["*"],
          filter: {
            name: {
              _eq: "CV Book"
            }
          },
          limit: 1,
        })
      ) as unknown as CareerSubOption[] | null;

      // Handle both array and { data: [...] } formats
      const items = Array.isArray(result) ? result : (result as any)?.data;
      if (items && items.length > 0) {
        console.log("[getCVBookSubOption] Found CV Book sub-option:", items[0]);
        return items[0];
      }
      console.warn("[getCVBookSubOption] No CV Book sub-option found with filter");
      
      // Try without filter to see all sub-options
      const allSubOptions = await client.request(
        readItems("career_sub_option", {
          fields: ["*"],
          limit: 100,
        })
      ) as unknown as CareerSubOption[] | null;
      
      const allItems = Array.isArray(allSubOptions) ? allSubOptions : (allSubOptions as any)?.data;
      console.log("[getCVBookSubOption] All sub-options:", allItems);
      
      if (allItems) {
        const cvBook = allItems.find((opt: any) => 
          opt && typeof opt === 'object' && 
          'name' in opt && 
          typeof opt.name === 'string' &&
          opt.name.toLowerCase().trim() === "cv book".toLowerCase().trim()
        );
        if (cvBook) {
          console.log("[getCVBookSubOption] Found CV Book in all sub-options:", cvBook);
          return cvBook as CareerSubOption;
        }
      }
      
      return null;
    } catch (fetchError) {
      console.error("[getCVBookSubOption] Error fetching:", fetchError);
      return null;
    }
  } catch (error) {
    console.error("[getCVBookSubOption] Outer error:", error);
    return null;
  }
}

