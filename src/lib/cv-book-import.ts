// lib/cv-book-import.ts -- imports an older year's CV book from a Litus export
// (/admin/cv-book -> "Import old CV book", via /api/admin/cv-book-import).
import "server-only";

import { parseLitusCVBook, splitPages, type LitusBook } from "@/lib/litus-cv-book";
import { createImportedCVBook, type ImportedCV } from "@/lib/repos/cv-book";
import { listAcademicYearsForAdmin } from "@/lib/repos/academic-year";
import { discardStoredBytes, writeStoredBytes } from "@/lib/file-storage";
import type { CVBook } from "@/lib/schema";

/** An admin's correction to one CV in the preview, keyed by its first page. */
export type CVImportEdit = { page: number; firstName: string; lastName: string; email: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What the preview shows: every CV found, with what deserves a second look. */
export async function previewLitusImport(bytes: Uint8Array): Promise<LitusBook> {
  return parseLitusCVBook(bytes);
}

/** "Name - CV book 2024-2025.pdf", without characters a download name cannot hold. */
function downloadName(cv: { firstName: string; lastName: string }, yearName: string): string {
  return `${cv.firstName} ${cv.lastName} - CV book ${yearName}.pdf`.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "");
}

/**
 * Reads the export again (the preview kept nothing), leaves out the CVs the
 * admin unticked, applies their corrections, cuts one PDF per CV and creates
 * the book, hidden. The files go
 * to disk first and get their rows in the book's transaction; if anything
 * fails, the files written so far are removed again.
 */
export async function importLitusCVBook(input: {
  bytes: Uint8Array;
  yearId: number;
  edits: CVImportEdit[];
  /** First pages of CVs to leave out of the book. */
  skip: number[];
  importedBy: string | null;
}): Promise<CVBook> {
  const year = (await listAcademicYearsForAdmin()).find((y) => Number(y.id) === input.yearId);
  if (!year) throw new Error("Pick an academic year.");
  const yearName = year.name || String(year.id);

  const book = await parseLitusCVBook(input.bytes);
  const edits = new Map(input.edits.map((e) => [e.page, e]));
  const skip = new Set(input.skip);
  const kept = book.cvs.filter((cv) => !skip.has(cv.page));
  if (kept.length === 0) throw new Error("Tick at least one CV to import.");
  const cvs = kept.map((cv) => {
    const edit = edits.get(cv.page);
    const firstName = (edit?.firstName ?? cv.firstName).trim();
    const lastName = (edit?.lastName ?? cv.lastName).trim();
    const email = (edit?.email ?? cv.email ?? "").trim().toLowerCase() || null;
    if (!firstName || !lastName) throw new Error(`The CV on page ${cv.page} needs a first and a last name.`);
    if (email && !EMAIL.test(email)) throw new Error(`The CV on page ${cv.page} has an invalid email address.`);
    return { ...cv, firstName, lastName, email };
  });

  const written: string[] = [];
  try {
    const imported: ImportedCV[] = [];
    let i = 0;
    for await (const pdf of splitPages(input.bytes, cvs.map((cv) => cv.pages))) {
      const cv = cvs[i++];
      const id = await writeStoredBytes(pdf);
      written.push(id);
      imported.push({
        firstName: cv.firstName,
        lastName: cv.lastName,
        email: cv.email,
        study: cv.programme,
        file: { id, filename: downloadName(cv, yearName), size: pdf.length },
      });
    }
    return await createImportedCVBook({
      yearId: input.yearId,
      formName: `CV book ${yearName} (imported)`,
      importedBy: input.importedBy,
      cvs: imported,
    });
  } catch (error) {
    await Promise.all(written.map((id) => discardStoredBytes(id).catch(() => undefined)));
    throw error;
  }
}
