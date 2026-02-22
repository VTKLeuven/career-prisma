// lib/repos/event.ts
"use server"

import { readItems } from "@directus/sdk";
import { directus } from "@/lib/directus";
import type { CareerEvent, CareerEventPage } from "@/lib/schema";

export async function listEvents(opts?: {
  search?: string;
  limit?: number;
  page?: number;        // 1-based
  sort?: string;        // e.g. "-date_created" or "name"
}) {
  try {

    const { search, limit = 25, page = 1, sort = "date" } = opts ?? {};
    return directus.request(
      readItems("career_event", {
        fields: [
          "*",
          // Try both possible junction table structures for many-to-many
          "options.career_event_option_id.*",
          "options.career_event_option_id.id",
          "options.career_event_option_id.name",
          "options.career_event_option_id.description",
          "options.career_event_option_id.price",
          "options.career_event_option_id.events.*",
          "options.career_event_option_id.event.*",
        ],
        limit,
        page,
        sort,
        ...(search
          ? { search } // Directus full-text search (if enabled)
          : {}),
      })
    ) as unknown as CareerEvent[];
  } catch (error) {
    console.log(error);
  }
}

export async function listEventPages(opts?: {
  search?: string;
  limit?: number;
  page?: number;
  sort?: string; // e.g. "event.date" or "-event.date"
}) {
  try {
    const { search, limit = 25, page = 1, sort = "event.date"} = opts ?? {};

    const list = await directus.request(
      readItems("career_event_page", {
        fields: [
          "*",
          "*.*",
          "event.*", // make sure we get event fields
          "timetable.timetable_id.*",
          "companies.company_id.*",
          "companies.company_id.page_on_platform",
          "companies.company_id.status",
          "floorplan.*", // include floorplan relation
          "company_guide.*", // include company guide file
        ],
        limit,
        page,
        ...(search ? { search } : {}),
        deep: { companies: { limit: 10000 } }, // Override Directus QUERY_LIMIT_DEFAULT (100)
      })
    ) as unknown as CareerEventPage[];

    let sortedList = list;

    if (sort) {
      const desc = sort.startsWith("-");
      const fieldPath = desc ? sort.slice(1) : sort; // e.g. "event.date"

      sortedList = list.sort((a, b) => {
        const getField = (obj: Record<string, unknown>, path: string): unknown =>
          path.split(".").reduce((o, key) => o?.[key] as Record<string, unknown>, obj as Record<string, unknown>);

        const valA = getField(a as unknown as Record<string, unknown>, fieldPath);
        const valB = getField(b as unknown as Record<string, unknown>, fieldPath);

        const timeA = valA ? new Date(valA as string | number).getTime() : 0;
        const timeB = valB ? new Date(valB as string | number).getTime() : 0;

        return desc ? timeB - timeA : timeA - timeB;
      });
    }

    // console.log("Fetched and sorted event pages:", sortedList);
    return sortedList;
  } catch (error) {
    console.error("Error fetching event pages:", error);
    return [];
  }
}

export async function getEventPageBySlug(slug: string): Promise<CareerEventPage | null> {
  try {
    // Step 1: Fetch all events to find the one matching the slug
    const events = await directus.request(
      readItems("career_event", {
        fields: ["id", "name"],
        limit: 100, // Reasonable limit for events
      })
    ) as unknown as Array<{ id: string; name: string }>;

    // Find event where slugified name matches
    const normalizedSlug = slug.toLowerCase().trim();
    const matchingEvent = events.find((event) => {
      const eventSlug = event.name.toLowerCase().replace(/\s+/g, "-");
      return eventSlug === normalizedSlug;
    });

    if (!matchingEvent) {
      return null;
    }

    // Step 2: Fetch the event page for this specific event
    const pages = await directus.request(
      readItems("career_event_page", {
        fields: [
          "*",
          "*.*",
          "event.*",
          "timetable.timetable_id.*",
          "companies.company_id.*",
          "companies.company_id.page_on_platform",
          "companies.company_id.status",
          "floorplan.*", // include floorplan relation
          "company_guide.*", // include company guide file
        ],
        filter: {
          event: {
            _eq: matchingEvent.id,
          },
        },
        limit: 1,
        deep: { companies: { limit: 10000 } }, // Override Directus QUERY_LIMIT_DEFAULT (100) (no default limit)
      })
    ) as unknown as CareerEventPage[];

    return pages.length > 0 ? pages[0] : null;
  } catch (error) {
    console.error("Error fetching event page by slug:", error);
    return null;
  }
}
