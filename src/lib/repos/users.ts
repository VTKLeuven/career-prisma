// lib/repos/users.ts
"use server"

import { readItems, readItem, createItem, updateItem } from "@directus/sdk";
import { getFullDirectusWithToken } from "@/lib/directus";
import { DirectusUser } from "@directus/sdk";

const USER_FIELDS = [
  "id",
  "first_name",
  "last_name",
  "email",
] as const;

export async function createRep(payload: Partial<DirectusUser>) {
  const directus = await getFullDirectusWithToken();
  if (!directus) return null;

  return await directus.users.createOne(payload);
}
