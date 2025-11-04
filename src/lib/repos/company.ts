// lib/repos/company.ts
"use server"

import { readItems, readItem, createItem, updateItem } from "@directus/sdk";
import { getDirectusWithToken } from "@/lib/directus";
import type { Company } from "@/lib/schema";


export async function listCompanies(opts?: {
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
      readItems("company", {
        fields: ["*", "*.*", "*.*.*"],
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
  }
}

export async function getCompanyById(id: string) {
  const directus = await getDirectusWithToken();
  if (!directus) return null;
  
  return directus.request(
    readItem("company", id, {
      fields: ["*", "representatives.*", "category.master_id.*", "options.career_event_option_id.*"],
    })
  ) as unknown as Company;
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
