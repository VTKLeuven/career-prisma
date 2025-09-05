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
] as const;

export async function createRep(payload: Partial<DirectusUser>) {
  const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? 'directus'}_access`;
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) throw new Error("No token available");

  try {
    const res = await fetch(`${process.env.DIRECTUS_URL}users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...payload,
        sendEmail: true // <-- triggers invitation email
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error("Failed to create user:", error);
      return null;
    }

    const json = await res.json();
    return json.data; // <-- return the actual created user
  } catch (err: any) {
    console.error("Failed to create user:", err.message);
    return null;
  }
}
