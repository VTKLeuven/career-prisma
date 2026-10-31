// app/api/admin/cv-book-import/route.ts -- reads (mode=preview) or imports
// (mode=import) a CV book exported from Litus. A route rather than a server
// action: the export is one PDF of several MB, past the server-action body
// limit, and it must not go through /api/upload, which would store the whole
// book as a public file.
import { NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { importLitusCVBook, previewLitusImport, type CVImportEdit } from "@/lib/cv-book-import";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 50 * 1024 * 1024;
/** The preview lists students' names and emails: never cache it. */
const NO_STORE = { "Cache-Control": "private, no-store" };

const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: NO_STORE });

function parseEdits(raw: FormDataEntryValue | null): CVImportEdit[] {
  if (typeof raw !== "string" || !raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("Invalid corrections");
  return value.map((e) => ({
    page: Number(e?.page),
    firstName: String(e?.firstName ?? ""),
    lastName: String(e?.lastName ?? ""),
    email: String(e?.email ?? ""),
  }));
}

function parseSkip(raw: FormDataEntryValue | null): number[] {
  if (typeof raw !== "string" || !raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("Invalid list of CVs to leave out");
  return value.map(Number).filter(Number.isSafeInteger);
}

export async function POST(request: Request) {
  const user = await getUserFromCookies();
  if (!user?.admin) return fail("Unauthorized", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Upload the PDF again.", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return fail("No file provided.", 400);
  if (file.size > MAX_BYTES) return fail("The file is over the 50 MB limit.", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") return fail("That is not a PDF.", 400);

  try {
    if (form.get("mode") === "import") {
      const yearId = Number(form.get("yearId"));
      if (!Number.isSafeInteger(yearId)) return fail("Pick an academic year.", 400);
      const cvBook = await importLitusCVBook({
        bytes,
        yearId,
        edits: parseEdits(form.get("edits")),
        skip: parseSkip(form.get("skip")),
        importedBy: user.id,
      });
      return NextResponse.json({ cvBook }, { headers: NO_STORE });
    }
    return NextResponse.json(await previewLitusImport(bytes), { headers: NO_STORE });
  } catch (error) {
    // The messages are written for the admin (lib/litus-cv-book.ts,
    // lib/cv-book-import.ts); the log gets no student data.
    console.error("[cv-book-import] Failed:", error instanceof Error ? error.message : error);
    return fail(error instanceof Error ? error.message : "Import failed.", 400);
  }
}
