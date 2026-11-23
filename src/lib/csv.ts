// lib/csv.ts -- a small CSV reader for admin uploads, and the cell writer the
// CSV exports share.
//
// Excel in a Belgian (nl-BE / fr-BE) locale saves "CSV" with semicolons,
// because the comma is the decimal separator there, so the delimiter is
// guessed from the header line rather than assumed. Quoted fields may hold
// the delimiter, doubled quotes and line breaks.

/** Separates the answers of a multi-value field inside one exported cell. */
const CSV_LIST_SEPARATOR = "; ";

function csvText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

/**
 * One cell of a CSV export, quoted when it holds a comma, quote or line break.
 *
 * Values are trimmed, and an array (a multi-value answer) is joined with
 * `CSV_LIST_SEPARATOR` after trimming each item and dropping empty ones. Stored
 * answers, option labels and master names are saved as typed, so they can
 * carry stray spaces; these exports feed InDesign data merges, where a leading
 * space or a dangling "; " shows up in print (BR-64).
 */
export function csvCell(value: unknown): string {
  const text = Array.isArray(value)
    ? value.map(csvText).filter((item) => item !== "").join(CSV_LIST_SEPARATOR)
    : csvText(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * A resolved programme/faculty display label ("Fac. <faculty> - <programme>" or
 * a bare programme name) as it should appear in a CSV export: whitespace runs
 * collapsed to one space and the ends trimmed. The label is built from names
 * saved as typed, so a stray space in a name otherwise doubles up inside it
 * ("Fac. X -  Y"). Only for these structural labels, never for free-text
 * answers, and only in exports: matching uses the labels unchanged (BR-64).
 */
export function csvDisplayLabel(label: string): string {
  return label.replace(/\s+/g, " ").trim();
}

export type CsvTable = {
  /** Header cells as written (trimmed). */
  headers: string[];
  /** One entry per non-empty data line; `line` is its 1-based line in the file. */
  rows: { line: number; cells: string[] }[];
};

const DELIMITERS = [",", ";", "\t"] as const;

/** The candidate delimiter that occurs most often (outside quotes) on the first line. */
function guessDelimiter(text: string): string {
  const counts = new Map<string, number>(DELIMITERS.map((d) => [d, 0]));
  let inQuotes = false;
  for (const char of text) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (char === "\n" || char === "\r")) break;
    else if (!inQuotes && counts.has(char)) counts.set(char, counts.get(char)! + 1);
  }
  let best = ",";
  for (const [d, n] of counts) if (n > counts.get(best)!) best = d;
  return best;
}

export function parseCsv(input: string): CsvTable {
  // Excel prefixes UTF-8 exports with a byte-order mark, which would otherwise
  // become part of the first header name.
  const text = input.replace(/^﻿/, "");
  const delimiter = guessDelimiter(text);

  const records: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;

  const endCell = () => {
    cells.push(cell.trim());
    cell = "";
  };
  const endRecord = () => {
    endCell();
    if (cells.some((c) => c !== "")) records.push({ line: recordLine, cells });
    cells = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        if (char === "\n") line++;
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      endCell();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      endRecord();
      line++;
      recordLine = line;
    } else {
      cell += char;
    }
  }
  if (cell !== "" || cells.length > 0) endRecord();

  const [header, ...rows] = records;
  return { headers: header?.cells ?? [], rows };
}

/** A header name reduced to lowercase letters, so "E-mail", "e_mail" and "Email" match. */
export function normalizeCsvHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z]/g, "");
}
