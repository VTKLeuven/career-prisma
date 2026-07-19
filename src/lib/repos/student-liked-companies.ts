// lib/repos/student-liked-companies.ts
"use server";

import { prisma } from "@/lib/prisma";

/**
 * Junction between students and the companies they liked (students_company).
 *
 * The Directus version probed for alternate column spellings at runtime
 * (students_id vs student_id, company_id vs liked_companies_id) because the
 * alias configuration was not known for certain. The columns are students_id
 * and company_id; the guessing is gone.
 */

/**
 * List liked company IDs for a student.
 */
export async function listLikedCompanyIds(studentId: string): Promise<string[]> {
  try {
    const rows = await prisma.studentCompany.findMany({
      where: { students_id: Number(studentId) },
      select: { company_id: true },
    });

    return rows.map((r) => r.company_id).filter((id): id is string => Boolean(id));
  } catch (error) {
    console.error("[listLikedCompanyIds] Error:", error);
    return [];
  }
}

/**
 * Add a company to the student's liked list.
 *
 * Idempotent: liking twice previously inserted a second junction row, which
 * then showed up as a duplicate id from listLikedCompanyIds.
 */
export async function addLikedCompany(
  studentId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const students_id = Number(studentId);

    const existing = await prisma.studentCompany.findFirst({
      where: { students_id, company_id: companyId },
      select: { id: true },
    });
    if (existing) return { success: true };

    await prisma.studentCompany.create({
      data: { students_id, company_id: companyId },
    });
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
    await prisma.studentCompany.deleteMany({
      where: { students_id: Number(studentId), company_id: companyId },
    });
    return { success: true };
  } catch (error) {
    console.error("[removeLikedCompany] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove liked company",
    };
  }
}
