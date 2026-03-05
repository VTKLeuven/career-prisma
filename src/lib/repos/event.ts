// lib/repos/event.ts
"use server"

import { readItems } from "@directus/sdk";
import { directus, getServerDirectusClient } from "@/lib/directus";
import type { CareerEvent, CareerEventPage } from "@/lib/schema";
import { slugifyEventName } from "@/lib/utils/slugify";

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
          "options.career_event_option_id.*" as any,
          "options.career_event_option_id.id" as any,
          "options.career_event_option_id.name" as any,
          "options.career_event_option_id.description" as any,
          "options.career_event_option_id.price" as any,
          "options.career_event_option_id.events.*" as any,
          "options.career_event_option_id.event.*" as any,
        ],
        limit,
        page,
        sort: sort as any,
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
    const client = (await getServerDirectusClient()) ?? directus;

    const list = await client.request(
      readItems("career_event_page", {
        fields: [
          "*",
          "*.*",
          "event.*", // make sure we get event fields
          "timetable.timetable_id.*",
          "companies.company_id.*",
          "companies.company_id.page_on_platform",
          "companies.company_id.status",
          "companies.company_id.options.career_event_option_id.events.career_event_option_id.sub_options.career_sub_option_id.*",
          "floorplan.*",
          "floorplan.floorplan_category_form_fields", // explicit for floorplan category config
          "floorplan.floorplan_company_name_form_field",
          "company_guide.*", // include company guide file
        ] as any,
        limit,
        page,
        ...(search ? { search } : {}),
        deep: { companies: { limit: 10000 } } as any, // Override Directus QUERY_LIMIT_DEFAULT (100)
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

export async function getEventPageById(id: string): Promise<CareerEventPage | null> {
  try {
    const client = (await getServerDirectusClient()) ?? directus;
    const pages = await client.request(
      readItems("career_event_page", {
        fields: ["*", "event.*" as any, "floorplan.*" as any],
        filter: { id: { _eq: id as any } },
        limit: 1,
      })
    ) as unknown as CareerEventPage[];

    return pages.length > 0 ? pages[0] : null;
  } catch (error) {
    console.error("Error fetching event page by ID:", error);
    return null;
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

    // Find event where slugified name matches (normalize accents for both)
    const normalizedSlug = slugifyEventName(slug);
    const matchingEvent = events.find((event) => {
      const eventSlug = slugifyEventName(event.name);
      return eventSlug === normalizedSlug;
    });

    if (!matchingEvent) {
      return null;
    }

    // Step 2: Fetch the event page for this specific event
    const client = (await getServerDirectusClient()) ?? directus;
    const pages = await client.request(
      readItems("career_event_page", {
        fields: [
          "*",
          "*.*" as any,
          "event.*",
          "timetable.timetable_id.*",
          "companies.company_id.*",
          "companies.company_id.page_on_platform",
          "companies.company_id.status",
          "companies.company_id.options.career_event_option_id.events.career_event_option_id.sub_options.career_sub_option_id.*",
          "floorplan.*", // include floorplan relation
          "company_guide.*", // include company guide file
        ],
        filter: {
          event: {
            _eq: matchingEvent.id as any,
          },
        },
        limit: 1,
        deep: { companies: { limit: 10000 } } as any, // Override Directus QUERY_LIMIT_DEFAULT (100) (no default limit)
      })
    ) as unknown as CareerEventPage[];

    return pages.length > 0 ? pages[0] : null;
  } catch (error) {
    console.error("Error fetching event page by slug:", error);
    return null;
  }
}
