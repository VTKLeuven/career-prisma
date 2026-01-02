// lib/auth-server.ts
import "server-only";
import { readMe } from "@directus/sdk";
import { getDirectusWithToken } from "./directus";
import { DirectusRole, DirectusUser } from "@/lib/schema";

export async function getUserFromCookies(): Promise<DirectusUser | undefined> {
  try {
    const directus = await getDirectusWithToken(); // reads access cookie internally
    if (!directus) {
      return undefined;
    }

    // Try to fetch user info - this will throw if token is invalid/expired
    const me = await directus.request(
      readMe({
        fields: ["*", "*.*"],
      })
    );

    // Validate that we actually got a valid user response with required fields
    if (!me || !me.id || !me.email || !me.role || !me.role.id) {
      console.log('[getUserFromCookies] Invalid user data returned from Directus');
      return undefined;
    }

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
  } catch (error) {
    // If any error occurs (invalid token, expired token, network error, etc.), return undefined
    // Log the error type to help debug authentication issues
    if (error instanceof Error) {
      console.log('[getUserFromCookies] Auth error:', error.message);
    } else {
      console.log('[getUserFromCookies] Auth error: Unknown error');
    }
    return undefined;
  }
}
