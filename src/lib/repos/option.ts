// lib/repos/option.ts
"use server"

import { readItems } from "@directus/sdk";
import { getDirectusWithToken, directus, getServerDirectusClient } from "@/lib/directus";
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
        fields: ["*", "*.*", "*.*.*", "sub_options.*", "sub_options.career_sub_option_id.*"],
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
 * Fetch all career sub-options from career_sub_option collection
 */
export async function listCareerSubOptions(opts?: { limit?: number }): Promise<CareerSubOption[]> {
  try {
    const { limit = 200 } = opts ?? {};
    const client = (await getDirectusWithToken()) ?? (await getServerDirectusClient());
    if (!client) return [];

    const result = await client.request(
      readItems("career_sub_option", {
        fields: ["*"],
        limit,
        sort: ["name"],
      })
    ) as unknown as CareerSubOption[] | { data: CareerSubOption[] } | null;

    const items = Array.isArray(result) ? result : (result as { data?: CareerSubOption[] })?.data ?? [];
    return items;
  } catch (error) {
    console.error("[listCareerSubOptions] Error:", error);
    return [];
  }
}

/**
 * Fetch career sub-options by IDs. Handles both:
 * - career_sub_option IDs (when sub_options returns related item IDs)
 * - Junction table IDs (when sub_options returns junction IDs - fetches career_sub_option_id from junction)
 */
export async function getCareerSubOptionsByIds(ids: (string | number)[]): Promise<CareerSubOption[]> {
  if (ids.length === 0) return [];
  try {
    const client = (await getDirectusWithToken()) ?? (await getServerDirectusClient());
    if (!client) return [];

    const result = await client.request(
      readItems("career_sub_option", {
        fields: ["*"],
        filter: { id: { _in: ids } },
        limit: ids.length,
      })
    ) as unknown as CareerSubOption[] | { data: CareerSubOption[] } | null;

    let items = Array.isArray(result) ? result : (result as { data?: CareerSubOption[] })?.data ?? [];

    // If empty, ids might be junction table IDs - try fetching from junction tables
    if (items.length === 0) {
      const junctionConfigs: { name: string; fkFields: string[] }[] = [
        { name: "career_event_option_sub_options", fkFields: ["career_sub_option_id", "career_sub_option"] },
        { name: "career_event_option_career_sub_option", fkFields: ["career_sub_option_id", "career_sub_option"] },
        { name: "career_event_option_id_sub_options", fkFields: ["career_sub_option_id", "career_sub_option"] },
        { name: "career_event_option_events_sub_options", fkFields: ["career_sub_option_id", "career_sub_option"] },
        { name: "career_event_option_events_career_sub_option", fkFields: ["career_sub_option_id", "career_sub_option"] },
        { name: "career_event_option_id_career_sub_option_id", fkFields: ["career_sub_option_id"] },
      ];
      for (const { name: junctionName, fkFields } of junctionConfigs) {
        for (const fkField of fkFields) {
          try {
            const junctionResult = await client.request(
              readItems(junctionName, {
                fields: [fkField, `${fkField}.*`],
                filter: { id: { _in: ids } },
                limit: ids.length,
              })
            ) as unknown as Array<Record<string, unknown>> | { data: Array<Record<string, unknown>> } | null;
            const junctionItems = Array.isArray(junctionResult) ? junctionResult : (junctionResult as { data?: Array<Record<string, unknown>> })?.data ?? [];
            items = junctionItems
              .map((j) => {
                const ref = j[fkField];
                return ref && typeof ref === "object" && "name" in ref ? (ref as CareerSubOption) : null;
              })
              .filter((s): s is CareerSubOption => s != null);
            if (items.length > 0) break;
          } catch {
            continue;
          }
        }
        if (items.length > 0) break;
      }
    }
    return items;
  } catch (error) {
    console.error("[getCareerSubOptionsByIds] Error:", error);
    return [];
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

