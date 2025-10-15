// lib/repos/users.ts
"use server"

import { readItems, readItem, createItem, updateItem } from "@directus/sdk";
import { getDirectusWithToken } from "@/lib/directus";
import { DirectusUser } from "@directus/sdk";
import { cookies } from "next/headers";

const USER_FIELDS = [
  "id",
  "first_name",
  "last_name",
  "email",
  "avatar",
  "title",
  "description"
] as const;

// --- Invite new rep (sends invitation email) ---
export async function createRep(payload: Partial<DirectusUser>) {
  const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? 'directus'}_access`;
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) throw new Error("No token available");

  const email = payload.email;
  const role = payload.role;

  try {
    const res = await fetch(`${process.env.DIRECTUS_URL}users/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ email, role }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      console.error("Failed to invite user:", error);
      return null;
    }

    // Some Directus versions return 204 No Content
    if (res.status === 204) {
      // Fetch the user we just created, by email
      const lookup = await fetch(`${process.env.DIRECTUS_URL}users?filter[email][_eq]=${email}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const json = await lookup.json();
      return json.data?.[0] ?? null;
    }

    const json = await res.json();
    return json.data ?? null;
  } catch (err: any) {
    console.error("Failed to invite user:", err.message);
    return null;
  }
}

// --- Update rep (names or any other fields) ---
export async function updateRep(userId: string, updates: Partial<DirectusUser>) {
  const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? 'directus'}_access`;
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) throw new Error("No token available");

  try {
    const res = await fetch(`${process.env.DIRECTUS_URL}users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error("Failed to update user:", error);
      return null;
    }

    const json = await res.json();
    return json.data; // the updated user
  } catch (err: any) {
    console.error("Failed to update user:", err.message);
    return null;
  }
}

export async function listSalespersons(opts?: {
  search?: string;
  limit?: number;
  page?: number;        // 1-based
  sort?: string;        // e.g. "-date_created" or "first_name"
}) {
  const { search, limit = 25, page = 1, sort = "first_name" } = opts ?? {};

  try {
    const params = new URLSearchParams({
      fields: USER_FIELDS.join(","),     // list of fields you want
      limit: String(limit),
      page: String(page),
      sort,
      filter: JSON.stringify({
        role: { _eq: "7b128ef4-f530-47d2-8f4c-ef82518eb313" }, // sales role UUID
      }),
    });

    if (search) {
      params.set("search", search);
    }

    // Public (no auth header)
    const res = await fetch(`${process.env.DIRECTUS_URL}users?${params}`, {
      // No Authorization header — public access
      next: { revalidate: 60 }, // optional caching (Next.js)
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      console.error("Failed to fetch public salespersons:", error);
      return [];
    }

    const json = await res.json();
    return json.data as DirectusUser[];
  } catch (err: any) {
    console.error("Failed to fetch public salespersons:", err.message);
    return [];
  }
}

