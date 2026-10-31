// lib/litus-cv-book.ts -- reads a CV book exported from Litus, VTK's old
// platform, so it can be imported as an older year's book
// (lib/cv-book-import.ts). No database or disk access here.
import "server-only";

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
// @ts-expect-error -- the worker ships without type declarations
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";
import { decodePDFRawStream, PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, type PDFPage } from "pdf-lib";

/*
 * What a Litus export looks like (Apache FOP, one PDF per year, real text):
 *   - a foreword, programme descriptions and a table of contents;
 *   - per programme, a divider page with its name in 30 pt;
 *   - one page per student: the name in bold 13 pt at the top, then email
 *     (not always), phone, birth date, address, an optional photo and fixed
 *     sections starting with "About Myself";
 *   - a long CV running onto the next page, which then has no name at the top;
 *   - blank pages (footer only) so each programme starts on a right-hand page;
 *   - an alphabetical index ("Name  page") at the back.
 * Every page carries a footer: "CV-Book", the page number and the programme.
 * Nothing in the file marks these parts, so they are told apart by font size
 * and position; the index is the cross-check that no CV was missed.
 */

/** Text below this (PDF points from the bottom) is the page footer. */
const FOOTER_TOP = 60;
/** Divider titles are 30 pt; nothing else comes close. */
const DIVIDER_MIN_HEIGHT = 24;
/** The student's name: 13 pt, at the very top of the page. */
const NAME_HEIGHT = { min: 11.5, max: 16 };
const NAME_MIN_Y = 740;
const CV_MARKER = "About Myself";
const INDEX_MARKER = "Alphabetical Index";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LitusCV = {
  /** 1-based page in the export where the CV starts. */
  page: number;
  /** Every page of it: a long CV runs onto the next page. */
  pages: number[];
  firstName: string;
  lastName: string;
  email: string | null;
  /** The programme divider the CV sits under, as printed (minus Litus' repeated suffix). */
  programme: string;
  /** Things an admin should look at before importing. */
  issues: string[];
};

export type LitusBook = {
  pageCount: number;
  cvs: LitusCV[];
  /** Pages that are neither front matter, divider, CV, CV continuation, blank nor index. */
  unrecognisedPages: number[];
  /** Index entries whose page holds no CV. */
  indexOrphans: { name: string; page: number }[];
};

type TextItem = { s: string; h: number; x: number; y: number; font: string };

/** Collapses runs of whitespace; FOP splits wrapped lines into separate items. */
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const sameName = (a: string, b: string) => clean(a).normalize("NFC").toLowerCase() === clean(b).normalize("NFC").toLowerCase();

/** Reading order: top to bottom, then left to right. */
const byReadingOrder = (a: TextItem, b: TextItem) => b.y - a.y || a.x - b.x;

/**
 * Litus prints a specialisation twice: "Master of X (Leuven) - Option: Y ( Y )".
 * The bracketed repeat (with spaces inside, unlike "(Leuven)") is dropped when
 * the rest of the title already says it.
 */
export function cleanProgrammeName(raw: string): string {
  const title = clean(raw);
  const repeat = /^(.*\S)\s+\(\s+(.+?)\s+\)$/.exec(title);
  if (repeat && repeat[1].toLowerCase().includes(repeat[2].toLowerCase())) return repeat[1];
  return title;
}

/** "Jonas Van Olmen" -> "Jonas" / "Van Olmen": Litus stores one full name. */
export function splitFullName(full: string): { firstName: string; lastName: string } {
  const [firstName = "", ...rest] = clean(full).split(" ");
  return { firstName, lastName: rest.join(" ") };
}

/**
 * pdf.js runs its parser in a worker. On a server there is none, so it loads
 * the worker module into this thread itself -- by a path relative to its own
 * file, which a bundled server build does not have. Handing it the module
 * (imported above, so the build includes it) skips that lookup.
 */
(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker ??= pdfjsWorker;

async function readPages(bytes: Uint8Array): Promise<TextItem[][]> {
  // pdf.js takes ownership of (and detaches) the buffer it is given.
  const doc = await getDocument({ data: bytes.slice(), verbosity: 0, isEvalSupported: false }).promise;
  try {
    const pages: TextItem[][] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const { items } = await page.getTextContent();
      pages.push(
        items
          .filter((i): i is Extract<typeof i, { str: string }> => "str" in i && i.str.trim() !== "")
          .map((i) => ({ s: i.str, h: i.height, x: i.transform[4], y: i.transform[5], font: i.fontName }))
          .filter((i) => i.y > FOOTER_TOP)
          .sort(byReadingOrder)
      );
      page.cleanup();
    }
    return pages;
  } finally {
    await doc.destroy();
  }
}

/** "Name  page" pairs from the index pages; a name may come in several items. */
function readIndex(items: TextItem[]): { name: string; page: number }[] {
  const entries: { name: string; page: number }[] = [];
  let name: string[] = [];
  for (const item of items) {
    const text = clean(item.s);
    if (text === INDEX_MARKER) continue;
    if (/^\d+$/.test(text)) {
      if (name.length) entries.push({ name: name.join(" "), page: Number(text) });
      name = [];
    } else {
      name.push(text);
    }
  }
  return entries;
}

function readCV(items: TextItem[], page: number, programme: string): LitusCV {
  const [top] = items;
  const nameItems = items.filter(
    (i) => i.font === top.font && Math.abs(i.h - top.h) < 0.5 && i.y > top.y - 30
  );
  const markerY = items.find((i) => clean(i.s) === CV_MARKER)?.y ?? -Infinity;
  const email = items.find((i) => i.y > markerY && EMAIL.test(clean(i.s)));
  const { firstName, lastName } = splitFullName(nameItems.map((i) => i.s).join(" "));
  return {
    page,
    pages: [page],
    firstName,
    lastName,
    email: email ? clean(email.s) : null,
    programme,
    issues: [],
  };
}

/**
 * Finds every CV in a Litus export. Throws when the file does not look like
 * one at all, so a wrong upload fails loudly instead of importing nothing.
 */
export async function parseLitusCVBook(bytes: Uint8Array): Promise<LitusBook> {
  let pages: TextItem[][];
  try {
    pages = await readPages(bytes);
  } catch {
    throw new Error("This file could not be read as a PDF.");
  }

  const cvs: LitusCV[] = [];
  const unrecognisedPages: number[] = [];
  const index: { name: string; page: number }[] = [];
  let programme: string | null = null; // null until the first divider: front matter
  let previousCV: LitusCV | null = null; // the CV on the page before, if any

  pages.forEach((items, i) => {
    const page = i + 1;
    const onPreviousPage = previousCV?.pages.at(-1) === page - 1 ? previousCV : null;
    previousCV = null;
    if (items.length === 0) return; // blank filler page
    // Only a title: the contents and the index also open with a large heading.
    if (items.every((it) => it.h >= DIVIDER_MIN_HEIGHT)) {
      programme = cleanProgrammeName(items.map((it) => it.s).join(" "));
      return;
    }
    if (programme === null) return; // foreword, programme descriptions, contents
    if (clean(items[0].s) === INDEX_MARKER || index.length > 0) {
      index.push(...readIndex(items));
      return;
    }
    const [top] = items;
    const looksLikeCV =
      top.h >= NAME_HEIGHT.min && top.h <= NAME_HEIGHT.max && top.y >= NAME_MIN_Y &&
      items.some((it) => clean(it.s) === CV_MARKER);
    if (looksLikeCV) {
      previousCV = readCV(items, page, programme);
      cvs.push(previousCV);
    } else if (onPreviousPage) {
      onPreviousPage.pages.push(page);
      previousCV = onPreviousPage;
    } else {
      unrecognisedPages.push(page);
    }
  });

  if (cvs.length === 0) {
    throw new Error("No CVs found. Is this a CV book exported from Litus?");
  }

  const indexByPage = new Map<number, string[]>();
  for (const entry of index) indexByPage.set(entry.page, [...(indexByPage.get(entry.page) ?? []), entry.name]);
  for (const cv of cvs) {
    if (!cv.email) cv.issues.push("No email address on the CV");
    if (!cv.lastName) cv.issues.push("Only one name: fill in the last name");
    if (index.length === 0) continue;
    const listed = indexByPage.get(cv.page);
    const full = `${cv.firstName} ${cv.lastName}`;
    if (!listed) cv.issues.push("Not in the book's index");
    else if (!listed.some((n) => sameName(n, full))) cv.issues.push(`The index lists "${listed.join('", "')}" for this page`);
  }
  const cvPages = new Set(cvs.map((cv) => cv.page));
  if (index.length === 0) {
    // Not fatal -- the CVs were found without it -- but nothing was cross-checked.
    for (const cv of cvs) cv.issues.push("The book has no index to check the name against");
  }

  return {
    pageCount: pages.length,
    cvs,
    unrecognisedPages,
    indexOrphans: index.filter((e) => !cvPages.has(e.page)),
  };
}

/**
 * One PDF per CV, from that CV's pages, in the order asked. Yields them one at
 * a time so a 300-CV book is never held in memory twice.
 */
export async function* splitPages(bytes: Uint8Array, cvs: number[][]): AsyncGenerator<Uint8Array> {
  const source = await PDFDocument.load(bytes, { updateMetadata: false });
  const sourcePages = source.getPages();
  for (const pages of cvs) {
    for (const page of pages) keepOnlyUsedImages(sourcePages[page - 1]);
    const single = await PDFDocument.create({ updateMetadata: false });
    const copied = await single.copyPages(source, pages.map((page) => page - 1));
    copied.forEach((page) => single.addPage(page));
    yield await single.save();
  }
}

/**
 * FOP gives every page one shared resource dictionary listing every image in
 * the book, and copying a page copies everything its resources point at: each
 * one-page CV came out at 7 MB, the size of the whole book. This gives the page
 * its own dictionary holding only the images its content draws (`/Name Do`).
 * The source document is only read from, so changing it in memory is safe.
 */
function keepOnlyUsedImages(page: PDFPage): void {
  const { node } = page;
  const resources = node.Resources();
  const xObjects = resources?.lookupMaybe(PDFName.of("XObject"), PDFDict);
  if (!resources || !xObjects) return;

  const contents = node.Contents();
  const streams = contents instanceof PDFArray
    ? contents.asArray().map((ref) => node.context.lookup(ref))
    : [contents];
  let ops = "";
  for (const stream of streams) {
    // Only streams read from the file; anything else keeps every image.
    if (!(stream instanceof PDFRawStream)) return;
    ops += Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1");
  }
  const used = new Set(Array.from(ops.matchAll(/\/([^\s/[\]()<>{}%]+)\s+Do\b/g), (m) => m[1]));

  const kept = node.context.obj({});
  for (const [name, value] of xObjects.entries()) {
    if (used.has(name.decodeText())) kept.set(name, value);
  }
  const own = resources.clone(node.context);
  own.set(PDFName.of("XObject"), kept);
  node.set(PDFName.of("Resources"), own);
}
