// lib/repos/cv-book-favourites.ts
"use server";

import { readItems, createItem, deleteItems } from "@directus/sdk";
import { getAdminDirectusClient } from "@/lib/directus";

const COLLECTION = "cv_book_favourite";

/**
 * List favourite form response IDs for a company in a CV book.
 * Uses admin client (server token) since company role may not have read permission.
 */
export async function listFavourites(
  companyId: string,
  cvBookId: string
): Promise<string[]> {
  try {
    const client = getAdminDirectusClient();
    if (!client) return [];

    const allItems = (await client.request(
      readItems(COLLECTION, {
        fields: ["*"],
        limit: 500,
      })
    )) as unknown as Array<Record<string, unknown>>;

    const companyStr = String(companyId);
    const cvBookStr = String(cvBookId);
    const filtered = (allItems ?? []).filter((i) => {
      const c = i.company ?? i.company_id;
      const cb = i.cv_book ?? i.cv_book_id;
      const cVal = typeof c === "object" && c && "id" in c ? (c as { id: string }).id : c;
      const cbVal = typeof cb === "object" && cb && "id" in cb ? (cb as { id: string }).id : cb;
      return cVal !== undefined && String(cVal) === companyStr &&
             cbVal !== undefined && String(cbVal) === cvBookStr;
    });

    const formResponseField = filtered[0] && ("form_response" in filtered[0] || "form_response_id" in filtered[0])
      ? ("form_response" in filtered[0] ? "form_response" : "form_response_id")
      : "form_response";
    return filtered
      .map((i) => {
        const fr = i[formResponseField];
        return typeof fr === "string" ? fr : (fr as { id?: string })?.id ?? (typeof fr === "number" ? String(fr) : null);
      })
      .filter(Boolean) as string[];
  } catch (error) {
    console.error("[listFavourites] Error:", error);
    return [];
  }
}

/**
 * Add a favourite. Caller must ensure companyId matches the authenticated user's company.
 * Uses admin client (server token) for consistent permissions.
 */
export async function addFavourite(
  companyId: string,
  formResponseId: string,
  cvBookId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getAdminDirectusClient();
    if (!client) {
      return { success: false, error: "Server not configured" };
    }

    await client.request(
      createItem(COLLECTION, {
        company: companyId,
        form_response: formResponseId,
        cv_book: cvBookId,
      })
    );
    return { success: true };
  } catch (error) {
    console.error("[addFavourite] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add favourite",
    };
  }
}

/**
 * Remove a favourite. Caller must ensure companyId matches the authenticated user's company.
 * Uses admin client (server token) for consistent permissions.
 */
export async function removeFavourite(
  companyId: string,
  formResponseId: string,
  cvBookId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getAdminDirectusClient();
    if (!client) {
      return { success: false, error: "Server not configured" };
    }

    await client.request(
      deleteItems(COLLECTION, {
        filter: {
          _and: [
            { company: { _eq: companyId } },
            { form_response: { _eq: formResponseId } },
            { cv_book: { _eq: cvBookId } },
          ],
        },
      })
    );
    return { success: true };
  } catch (error) {
    console.error("[removeFavourite] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove favourite",
    };
  }
}
