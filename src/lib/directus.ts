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
 * Server-side client that always uses the server token for admin operations.
 * This ensures elevated permissions for operations that require access to restricted fields.
 */
export function getAdminDirectusClient() {
  const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
  if (serverToken && serverToken.trim() !== '') {
    return createDirectus(DIRECTUS_URL).with(staticToken(serverToken)).with(rest());
  }
  
  // If no server token, return null to indicate admin operations are not available
  return null;
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
    console.log('[getFormUploadsFolderId] Querying Directus for folder "Form_uploads"');
    
    // Try both "directus_folders" and "folders" collection names
    const collectionNames = ["directus_folders", "folders"];
    let folders: Array<{ id: string; name: string }> = [];
    let usedCollection = "";

    for (const collectionName of collectionNames) {
      try {
        const result = await client.request(
          readItems(collectionName as any, {
            fields: ["id", "name"],
            filter: {
              name: {
                _eq: "Form_uploads",
              },
            },
            limit: 1,
          })
        ) as Array<{ id: string; name: string }>;
        
        if (result && result.length > 0) {
          folders = result;
          usedCollection = collectionName;
          console.log(`[getFormUploadsFolderId] Found folder using collection "${collectionName}":`, folders);
          break;
        }
      } catch (err) {
        console.log(`[getFormUploadsFolderId] Collection "${collectionName}" not accessible or error:`, err);
        continue;
      }
    }

    if (folders && folders.length > 0) {
      cachedFormUploadsFolderId = folders[0].id;
      console.log('[getFormUploadsFolderId] Using folder ID:', cachedFormUploadsFolderId);
      return cachedFormUploadsFolderId;
    }

    // Folder not found - try case-insensitive search or check all folders
    console.warn('[getFormUploadsFolderId] Folder "Form_uploads" not found. Checking all folders...');
    for (const collectionName of collectionNames) {
      try {
        const allFolders = await client.request(
          readItems(collectionName as any, {
            fields: ["id", "name"],
            limit: 100,
          })
        ) as Array<{ id: string; name: string }>;
        
        console.log(`[getFormUploadsFolderId] All folders from "${collectionName}":`, allFolders.map(f => ({ id: f.id, name: f.name })));
        
        // Try case-insensitive match and variations
        const matchingFolder = allFolders.find(f => {
          const folderNameLower = f.name.toLowerCase().trim();
          return folderNameLower === "form_uploads" || 
                 folderNameLower === "form uploads" ||
                 folderNameLower === "formuploads" ||
                 f.name === "Form_uploads";
        });
        
        if (matchingFolder) {
          cachedFormUploadsFolderId = matchingFolder.id;
          console.log('[getFormUploadsFolderId] Found matching folder (case-insensitive):', matchingFolder.name, 'ID:', cachedFormUploadsFolderId);
          return cachedFormUploadsFolderId;
        }
        break; // If we got results from one collection, don't try the other
      } catch (err) {
        console.log(`[getFormUploadsFolderId] Error querying all folders from "${collectionName}":`, err);
        continue;
      }
    }

    // Folder not found
    console.warn('[getFormUploadsFolderId] Form_uploads folder not found in Directus. Files will be uploaded to root.');
    cachedFormUploadsFolderId = null;
    return null;
  } catch (error) {
    console.error('[getFormUploadsFolderId] Error fetching Form_uploads folder ID:', error);
    // Cache null to avoid repeated failed queries
    cachedFormUploadsFolderId = null;
    return null;
  }
}