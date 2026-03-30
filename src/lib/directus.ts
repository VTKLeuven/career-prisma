// lib/directus.ts
import {
  createDirectus,
  rest,
  staticToken,
  readItems,
} from "@directus/sdk";
import { cookies } from "next/headers";

import { Schema } from "@/lib/schema";

const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://localhost:8055";

/**
 * Base client (no auth).
 * Good for public collections or items that don't need user context.
 */
export const directus = createDirectus<Schema>(DIRECTUS_URL).with(rest());

/**
 * Factory: creates an authenticated client from a token
 */
export async function getDirectusWithToken() {
  const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  return createDirectus<Schema>(DIRECTUS_URL).with(staticToken(token)).with(rest());
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
    return createDirectus<Schema>(DIRECTUS_URL).with(staticToken(serverToken)).with(rest());
  }

  // If no server token, use public client (may have limited permissions)
  return directus;
}

/**
 * Prefer DIRECTUS_SERVER_TOKEN over the user cookie so long-lived form pages still submit
 * after the user's Directus access token expires (common when the tab stays open).
 */
export async function getServerDirectusClientPreferStatic() {
  const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
  if (serverToken && serverToken.trim() !== "") {
    return createDirectus<Schema>(DIRECTUS_URL).with(staticToken(serverToken.trim())).with(rest());
  }
  const userClient = await getDirectusWithToken();
  if (userClient) return userClient;
  return directus;
}

/**
 * Server-side client that always uses the server token for admin operations.
 * This ensures elevated permissions for operations that require access to restricted fields.
 */
export function getAdminDirectusClient() {
  const serverToken = process.env.DIRECTUS_SERVER_TOKEN;

  if (serverToken && serverToken.trim() !== '') {
    return createDirectus<Schema>(DIRECTUS_URL).with(staticToken(serverToken)).with(rest());
  }

  // If no server token, return null to indicate admin operations are not available
  return null;
}

/**
 * For admin operations (e.g. booth assignment): prefer server token for elevated permissions.
 * Falls back to user token if server token is not configured.
 */
export async function getDirectusForAdminOperations() {
  const adminClient = getAdminDirectusClient();
  if (adminClient) return adminClient;
  return getDirectusWithToken();
}

/**
 * Get the folder ID for the "Form_uploads" folder.
 * 
 * Configuration:
 * Set DIRECTUS_FORM_UPLOADS_FOLDER_ID in your .env file with the folder UUID.
 * You can find the folder ID in the Directus admin URL: /admin/files/folders/{folder-id}
 * 
 * Example:
 * DIRECTUS_FORM_UPLOADS_FOLDER_ID=0b249c3e-9cf5-4f43-bf06-2a1f5f52b653
 * 
 * If not set, attempts to query Directus to find the folder by name "Form_uploads".
 * Returns null if folder is not found.
 */
let cachedFormUploadsFolderId: string | null | undefined = undefined;

export async function getFormUploadsFolderId(): Promise<string | null> {
  // Return cached value if available
  if (cachedFormUploadsFolderId !== undefined) {
    return cachedFormUploadsFolderId ?? null;
  }

  // Check environment variable first (recommended approach)
  const envFolderId = process.env.DIRECTUS_FORM_UPLOADS_FOLDER_ID;
  if (envFolderId && envFolderId.trim() !== '') {
    cachedFormUploadsFolderId = envFolderId.trim();
    console.log('[getFormUploadsFolderId] Using folder ID from DIRECTUS_FORM_UPLOADS_FOLDER_ID:', cachedFormUploadsFolderId);
    return cachedFormUploadsFolderId;
  }

  // Fallback: Try to find folder by name (requires DIRECTUS_SERVER_TOKEN)
  console.warn('[getFormUploadsFolderId] DIRECTUS_FORM_UPLOADS_FOLDER_ID not set. Attempting to find folder by name...');
  console.warn('[getFormUploadsFolderId] To avoid this lookup, set DIRECTUS_FORM_UPLOADS_FOLDER_ID in your .env file');

  try {
    // Use admin client for folder lookup (requires elevated permissions)
    const adminClient = getAdminDirectusClient();
    if (!adminClient) {
      console.warn('[getFormUploadsFolderId] No admin client available (DIRECTUS_SERVER_TOKEN not set). Cannot lookup folders.');
      console.warn('[getFormUploadsFolderId] Please set DIRECTUS_FORM_UPLOADS_FOLDER_ID in your .env file');
      cachedFormUploadsFolderId = null;
      return null;
    }

    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    const directusUrl = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL;

    if (serverToken && directusUrl) {
      // Try REST API endpoint first
      const foldersUrl = `${directusUrl.replace(/\/$/, '')}/folders?filter[name][_eq]=Form_uploads&fields=id,name&limit=1`;
      const foldersResponse = await fetch(foldersUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${serverToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (foldersResponse.ok) {
        const foldersData = await foldersResponse.json();
        const folders = foldersData?.data || [];

        if (folders && folders.length > 0) {
          const folderId = folders[0].id ?? null;
          cachedFormUploadsFolderId = folderId;
          console.log('[getFormUploadsFolderId] Found folder via REST API:', folders[0].name, 'ID:', cachedFormUploadsFolderId);
          return folderId;
        }
      }
    }
  } catch (error) {
    console.error('[getFormUploadsFolderId] Error looking up folder by name:', error);
  }

  // Folder not found
  console.error('[getFormUploadsFolderId] Form_uploads folder not found.');
  console.error('[getFormUploadsFolderId] Please set DIRECTUS_FORM_UPLOADS_FOLDER_ID in your .env file');
  console.error('[getFormUploadsFolderId] Example: DIRECTUS_FORM_UPLOADS_FOLDER_ID=0b249c3e-9cf5-4f43-bf06-2a1f5f52b653');
  cachedFormUploadsFolderId = null;
  return null;
}