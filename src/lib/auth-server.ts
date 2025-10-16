// lib/auth-server.ts
import "server-only";
import { readMe } from "@directus/sdk";
import { getDirectusWithToken } from "./directus";
import { DirectusRole, DirectusUser } from "@/lib/schema";

export async function getUserFromCookies(): Promise<DirectusUser | undefined> {
  try {
    const directus = await getDirectusWithToken(); // reads access cookie internally
    if (!directus) return undefined;

    const me = await directus.request(
      readMe({
        fields: ["*", "*.*"],
      })
    );

    const isAdmin = me.role.id === "7b128ef4-f530-47d2-8f4c-ef82518eb313";

    return {
      id: me.id,
      name:
        (me.first_name || me.last_name
          ? `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim()
          : me.email) ?? "",
      email: me.email ?? "",
      tel: me?.tel ?? "not set",
      role: (me.role as DirectusRole)?.name ?? "Unknown",
      admin: isAdmin,
      company: me.company
    };
  } catch {
    return undefined;
  }
}
