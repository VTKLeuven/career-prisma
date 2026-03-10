"use server";

import { getStudentFromCookies } from "@/lib/auth-student";
import {
  listLikedCompanyIds,
  addLikedCompany,
  removeLikedCompany,
} from "@/lib/repos/student-liked-companies";
import { getCompaniesByIds } from "@/lib/repos/matching-software";

export async function fetchLikedCompanyIdsAction(): Promise<string[]> {
  const student = await getStudentFromCookies();
  if (!student?.id) return [];
  return listLikedCompanyIds(student.id);
}

/** Fetch liked companies with id, name, logo, status for the current student. */
export async function fetchLikedCompaniesAction(): Promise<
  Array<{ id: string; name?: string; logo?: string; status?: string }>
> {
  const student = await getStudentFromCookies();
  if (!student?.id) return [];
  const ids = await listLikedCompanyIds(student.id);
  if (ids.length === 0) return [];
  return getCompaniesByIds(ids);
}

export async function toggleLikedCompanyAction(
  companyId: string,
  isLiked: boolean
): Promise<{ success: boolean; error?: string }> {
  const student = await getStudentFromCookies();
  if (!student?.id) {
    return { success: false, error: "Not authenticated as student" };
  }

  if (isLiked) {
    return removeLikedCompany(student.id, companyId);
  } else {
    return addLikedCompany(student.id, companyId);
  }
}
