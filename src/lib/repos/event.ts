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

    const { search, limit = 25, page = 1, sort = "date" } = opts ?? {};
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
        ],
        limit,
        page,
        ...(search ? { search } : {}),
      })
    ) as unknown as CareerEventPage[];

    let sortedList = list;

    if (sort) {
      const desc = sort.startsWith("-");
      const fieldPath = desc ? sort.slice(1) : sort; // e.g. "event.date"

      sortedList = list.sort((a, b) => {
        const getField = (obj: any, path: string) =>
          path.split(".").reduce((o, key) => o?.[key], obj);

        const valA = getField(a, fieldPath);
        const valB = getField(b, fieldPath);

        const timeA = valA ? new Date(valA).getTime() : 0;
        const timeB = valB ? new Date(valB).getTime() : 0;

        return desc ? timeB - timeA : timeA - timeB;
      });
    }

    console.log("Fetched and sorted event pages:", sortedList);
    return sortedList;
  } catch (error) {
    console.error("Error fetching event pages:", error);
    return [];
  }
}