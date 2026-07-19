// lib/repos/cv-book-favourites.ts
"use server";

import { prisma } from "@/lib/prisma";

/**
 * Company favourites for student CVs within a CV book.
 *
 * The Directus version fetched the first 500 favourites across every company
 * and CV book and filtered them in JavaScript, so it would have started
 * returning incomplete results once the table passed 500 rows. The filter is
 * now a WHERE clause and the limit is gone.
 */

/**
 * List favourite form response IDs for a company in a CV book.
 */
export async function listFavourites(
  companyId: string,
  cvBookId: string
): Promise<string[]> {
  try {
    const rows = await prisma.cvBookFavourite.findMany({
      where: { company_id: companyId, cv_book: Number(cvBookId) },
      select: { form_response: true },
    });

    return rows
      .map((r) => (r.form_response == null ? null : String(r.form_response)))
      .filter((v): v is string => Boolean(v));
  } catch (error) {
    console.error("[listFavourites] Error:", error);
    return [];
  }
}

/**
 * Add a favourite. Caller must ensure companyId matches the authenticated
 * user's company.
 *
 * Idempotent: favouriting the same CV twice previously inserted a duplicate row.
 */
export async function addFavourite(
  companyId: string,
  formResponseId: string,
  cvBookId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const where = {
      company_id: companyId,
      form_response: Number(formResponseId),
      cv_book: Number(cvBookId),
    };

    const existing = await prisma.cvBookFavourite.findFirst({
      where,
      select: { id: true },
    });
    if (existing) return { success: true };

    await prisma.cvBookFavourite.create({
      data: { ...where, date_created: new Date() },
    });
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
 * Remove a favourite. Caller must ensure companyId matches the authenticated
 * user's company.
 */
export async function removeFavourite(
  companyId: string,
  formResponseId: string,
  cvBookId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.cvBookFavourite.deleteMany({
      where: {
        company_id: companyId,
        form_response: Number(formResponseId),
        cv_book: Number(cvBookId),
      },
    });
    return { success: true };
  } catch (error) {
    console.error("[removeFavourite] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove favourite",
    };
  }
}
