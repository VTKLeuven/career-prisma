// lib/file-access.ts -- who may open a private upload (files.private).
import "server-only";

import { getUserFromCookies } from "@/lib/auth-server";
import { getStudentFromCookies } from "@/lib/auth-student";
import { companyCanSeeCVFile } from "@/lib/repos/cv-book";
import { studentHasFileInResponses } from "@/lib/repos/forms";

/**
 * Uploads are public by UUID unless marked private, which today means a
 * student CV in a CV book (markCVFilesPrivate()). A private file opens for an
 * admin, for a company that can see that CV in a book it may open, and for
 * the student whose own response holds it. Everyone else gets a 404 from the
 * file routes, which do not say the file exists.
 */
export async function canReadFile(file: { id: string; private: boolean }): Promise<boolean> {
  if (!file.private) return true;

  const [user, student] = await Promise.all([getUserFromCookies(), getStudentFromCookies()]);
  if (user?.admin) return true;

  const companyId = user?.company && (typeof user.company === "string" ? user.company : user.company.id);
  if (companyId && (await companyCanSeeCVFile(companyId, file.id))) return true;

  return Boolean(student && (await studentHasFileInResponses(student.id, file.id)));
}

/** Private files must not sit in a shared cache, nor in the browser's once access is gone. */
export function fileCacheControl(file: { private: boolean }): string {
  return file.private ? "private, no-store" : "public, max-age=31536000, immutable";
}
