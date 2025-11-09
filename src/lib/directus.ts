// lib/directus.ts
import {
  createDirectus,
  rest,
  staticToken,
  readItems,
} from "@directus/sdk";
import { cookies } from "next/headers";

const DIRECTUS_URL = process.env.DIRECTUS_URL!;

/**
 * Base client (no auth).
 * Good for public collections or items that don't need user context.
 */
export const directus = createDirectus(DIRECTUS_URL).with(rest());

/**
 * Factory: creates an authenticated client from a token
 */
export async function getDirectusWithToken() {
  const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getAuthedDirectusOrThrow() {
  const client = await getDirectusWithToken();
  if (!client) {
    throw new Error("Forbidden"); // or make this a custom error
  }
  return client;
}

/**
 * Server-side client with static token for server operations.
 * Uses DIRECTUS_SERVER_TOKEN from environment for operations that need
 * elevated permissions (e.g., counting form responses for max_entries check).
 * Falls back to authenticated user token if available, otherwise uses server token.
 */
export async function getServerDirectusClient() {
  // First try to get authenticated user token (for logged-in users)
  const userClient = await getDirectusWithToken();
  if (userClient) {
    return userClient;
  }
  
  // Fall back to server token for public operations
  const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
  if (serverToken && serverToken.trim() !== '') {
    return createDirectus(DIRECTUS_URL).with(staticToken(serverToken)).with(rest());
  }
  
  // If no server token, use public client (may have limited permissions)
  return directus;
}

/**
 * Get the folder ID for the "Form_uploads" folder.
 * First checks environment variable DIRECTUS_FORM_UPLOADS_FOLDER_ID.
 * If not set, queries Directus to find the folder by name.
 * Returns null if folder is not found.
 */
let cachedFormUploadsFolderId: string | null | undefined = undefined;

export async function getFormUploadsFolderId(): Promise<string | null> {
  // Return cached value if available
  if (cachedFormUploadsFolderId !== undefined) {
    return cachedFormUploadsFolderId;
  }

  // Check environment variable first
  const envFolderId = process.env.DIRECTUS_FORM_UPLOADS_FOLDER_ID;
  if (envFolderId && envFolderId.trim() !== '') {
    cachedFormUploadsFolderId = envFolderId.trim();
    return cachedFormUploadsFolderId;
  }

  try {
    // Try to get folder by name using server client (has permissions to query folders)
    const client = await getServerDirectusClient();
    const folders = await client.request(
      readItems("directus_folders", {
        fields: ["id", "name"],
        filter: {
          name: {
            _eq: "Form_uploads",
          },
        },
        limit: 1,
      })
    ) as Array<{ id: string; name: string }>;

    if (folders && folders.length > 0) {
      cachedFormUploadsFolderId = folders[0].id;
      return cachedFormUploadsFolderId;
    }

    // Folder not found
    console.warn('Form_uploads folder not found in Directus. Files will be uploaded to root.');
    cachedFormUploadsFolderId = null;
    return null;
  } catch (error) {
    console.error('Error fetching Form_uploads folder ID:', error);
    // Cache null to avoid repeated failed queries
    cachedFormUploadsFolderId = null;
    return null;
  }
}