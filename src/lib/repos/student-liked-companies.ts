// lib/repos/student-liked-companies.ts
"use server";

import { readItems, createItem, deleteItems } from "@directus/sdk";
import { getAdminDirectusClient } from "@/lib/directus";

/**
 * Directus M2M junction for students.liked_companies -> company.
 * Check: Settings → Data Model → students → liked_companies field.
 */
const JUNCTION_COLLECTION = "students_company";

/**
 * List liked company IDs for a student.
 */
export async function listLikedCompanyIds(studentId: string): Promise<string[]> {
  try {
    const client = getAdminDirectusClient();
    if (!client) return [];

    const items = (await client.request(
      readItems(JUNCTION_COLLECTION as any, {
        fields: ["*"],
        filter: { students_id: { _eq: studentId } },
        limit: 1000,
      })
    )) as unknown as Array<Record<string, unknown>>;

    // Support alternate field names (Directus may use students_id or student_id, company_id or liked_companies_id)
    const companyField =
      items[0] && ("company_id" in items[0] || "liked_companies_id" in items[0])
        ? "company_id" in items[0]
          ? "company_id"
          : "liked_companies_id"
        : "company_id";

    return (items ?? [])
      .map((i) => {
        const val = i[companyField];
        return typeof val === "string" ? val : (val as { id?: string })?.id ?? (typeof val === "number" ? String(val) : null);
      })
      .filter(Boolean) as string[];
  } catch (error) {
    console.error("[listLikedCompanyIds] Error:", error);
    return [];
  }
}

/**
 * Add a company to the student's liked list.
 */
export async function addLikedCompany(
  studentId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getAdminDirectusClient();
    if (!client) {
      return { success: false, error: "Server not configured" };
    }

    await client.request(
      createItem(JUNCTION_COLLECTION as any, {
        students_id: studentId,
        company_id: companyId,
      })
    );
    return { success: true };
  } catch (error) {
    console.error("[addLikedCompany] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add liked company",
    };
  }
}

/**
 * Remove a company from the student's liked list.
 */
export async function removeLikedCompany(
  studentId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getAdminDirectusClient();
    if (!client) {
      return { success: false, error: "Server not configured" };
    }

    await client.request(
      deleteItems(JUNCTION_COLLECTION as any, {
        filter: {
          _and: [
            { students_id: { _eq: studentId } },
            { company_id: { _eq: companyId } },
          ],
        },
      })
    );
    return { success: true };
  } catch (error) {
    console.error("[removeLikedCompany] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove liked company",
    };
  }
}
