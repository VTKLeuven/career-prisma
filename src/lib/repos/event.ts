// lib/repos/company.ts
"use server"

import { readItems, readItem, createItem, updateItem } from "@directus/sdk";
import { getDirectusWithToken } from "@/lib/directus";
import type { CareerEvent } from "@/lib/schema";

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