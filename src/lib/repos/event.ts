// lib/repos/event.ts
"use server"

import { readItems, readItem, createItem, updateItem } from "@directus/sdk";
import { directus, getDirectusWithToken } from "@/lib/directus";
import type { CareerEvent, CareerEventPage, TimeSlot, Floorplan } from "@/lib/schema";

export async function listEvents(opts?: {
  search?: string;
  limit?: number;
  page?: number;        // 1-based
  sort?: string;        // e.g. "-date_created" or "name"
}) {
  try {
    const directus = await getDirectusWithToken();
    if (! directus) return null;

    const { search, limit = 25, page = 1, sort = "name" } = opts ?? {};
    return directus.request(
      readItems("career_event", {
        fields: ["*", "*.*"],
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
  sort?: string;
}) {
  try {
    const { search, limit = 25, page = 1 } = opts ?? {};

    const list = await directus.request(
      readItems("career_event_page", {
        fields: [
          "*",
          "*.*",
          "timetable.timetable_id.*", // ✅ get all timetable items from M2M
          "companies.company_id.*",
        ],
        limit,
        page,
        ...(search ? { search } : {}),
      })
    ) as unknown as CareerEventPage[];

    console.log("Fetched event pages:", list);
    return list;
  } catch (error) {
    console.error("Error fetching event pages:", error);
    return [];
  }
}
