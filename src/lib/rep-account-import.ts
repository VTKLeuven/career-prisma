// lib/rep-account-import.ts -- bulk-creating company representative accounts
// with a password chosen by an admin, from a CSV (/admin/users -> "Import
// accounts").
//
// Meant for the shared accounts companies scan with at an event: their address
// is often not a real inbox, so there is no invite and nothing is mailed. The
// same file is planned twice -- once for the preview, once more when the admin
// confirms -- so the server never acts on a plan the browser sent back.
import "server-only";

import argon2 from "argon2";
import { normalizeCsvHeader, parseCsv } from "@/lib/csv";
import { listCompaniesBasic } from "@/lib/repos/company";
import { findUsersByEmails } from "@/lib/repos/users";
import { writeRepAccounts, type RepAccountWrite } from "@/lib/repos/credentials";
import { ROLE_COMPANY_REP } from "@/lib/roles";

/** Same minimum as accept-invite, the reset flows and the add-representative dialog. */
export const MIN_PASSWORD_LENGTH = 8;
/** Structure only: these addresses are never mailed. */
export const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_BYTES = 512 * 1024;

// Column names accepted for each value, after normalizeCsvHeader(). Dutch
// spellings too, since the sheet is usually put together by VTK people.
const COLUMNS = {
  company: ["company", "companyname", "bedrijf", "bedrijfsnaam"],
  email: ["email", "emailaddress", "mail", "emailadres"],
  password: ["password", "wachtwoord"],
  firstName: ["firstname", "voornaam"],
  lastName: ["lastname", "achternaam", "familienaam"],
} as const;

/** One line of the file and what importing it does. Never holds the password. */
export type RepImportRow = {
  line: number;
  email: string;
  /** The company as typed in the file. */
  company: string;
  /** companyKey() of `company`: what a company chosen in the preview is keyed on. */
  companyKey: string;
  /** The company it matched (or was chosen for it), as stored. */
  companyId?: string;
  companyName?: string;
  /** The admin chose the company in the preview instead of it matching by name. */
  companyChosen?: boolean;
  /** Why the name did not match one company; the preview offers a picker for these. */
  companyProblem?: "not_found" | "ambiguous";
  /** "skip": the admin left this line out in the preview; it is not imported. */
  action: "create" | "update" | "error" | "skip";
  /** For an update: the company the account belonged to until now, when different. */
  movedFrom?: string;
  error?: string;
};

export type RepImportPlan = {
  rows: RepImportRow[];
  /** A problem with the file as a whole; no row can be imported. */
  fileError?: string;
};

/**
 * Companies the admin picked in the preview for names in the file that did not
 * match: companyKey(name as typed) -> company id. One choice covers every line
 * with that name.
 */
export type CompanyChoices = Record<string, string>;

/**
 * What the admin decided in the preview, sent back with the file on every
 * check and on import: companies picked for unmatched names, and the lines
 * (by line number in the file) to leave out.
 */
export type ImportChoices = { companies?: CompanyChoices; skippedLines?: number[] };

type PlannedRow = RepImportRow & {
  password: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
};

export const companyKey = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

async function plan(
  csvText: string,
  { companies: choices = {}, skippedLines = [] }: ImportChoices
): Promise<{ rows: PlannedRow[]; fileError?: string }> {
  const skipped = new Set(skippedLines);
  const { headers, rows } = parseCsv(csvText);
  const normalized = headers.map(normalizeCsvHeader);
  const column = (names: readonly string[]) => normalized.findIndex((h) => names.includes(h));
  const col = {
    company: column(COLUMNS.company),
    email: column(COLUMNS.email),
    password: column(COLUMNS.password),
    firstName: column(COLUMNS.firstName),
    lastName: column(COLUMNS.lastName),
  };

  const missing = (["company", "email", "password"] as const).filter((k) => col[k] < 0);
  if (missing.length > 0) {
    return {
      rows: [],
      fileError: `The first line must name the columns; missing: ${missing.join(", ")}. Found: ${headers.join(", ") || "(nothing)"}.`,
    };
  }
  if (rows.length === 0) return { rows: [], fileError: "The file has no accounts under its header line." };
  if (rows.length > MAX_IMPORT_ROWS) {
    return { rows: [], fileError: `At most ${MAX_IMPORT_ROWS} accounts per file; this one has ${rows.length}.` };
  }

  const cell = (cells: string[], index: number) => (index >= 0 ? (cells[index] ?? "").trim() : "");

  const companies = await listCompaniesBasic();
  const companiesById = new Map(companies.map((c) => [c.id, { id: c.id, name: c.name ?? "(unnamed)" }]));
  const companiesByKey = new Map<string, { id: string; name: string }[]>();
  for (const c of companies) {
    if (!c.name) continue;
    const key = companyKey(c.name);
    companiesByKey.set(key, [...(companiesByKey.get(key) ?? []), { id: c.id, name: c.name }]);
  }

  const emails = rows.map((r) => cell(r.cells, col.email).toLowerCase()).filter(Boolean);
  const existing = new Map(
    (await findUsersByEmails(emails)).map((u) => [u.email!.toLowerCase(), u])
  );

  const firstLineOf = new Map<string, number>();
  const planned: PlannedRow[] = [];

  for (const { line, cells } of rows) {
    const email = cell(cells, col.email).toLowerCase();
    const company = cell(cells, col.company);
    const password = cell(cells, col.password);
    const firstName = cell(cells, col.firstName);
    const lastName = cell(cells, col.lastName);
    const row: PlannedRow = { line, email, company, companyKey: companyKey(company), password, action: "error" };
    planned.push(row);

    // Before any check, so a skipped line neither blocks the import nor
    // counts as the first use of its address for the duplicate check.
    if (skipped.has(line)) {
      row.action = "skip";
      continue;
    }

    // An unquoted separator inside a value (a password with a ";") splits it
    // and shifts every cell after it, which would store a cut-off password.
    if (cells.length > headers.length) {
      row.error = "More values than columns: put quotes around a value that contains a comma or semicolon";
      continue;
    }
    const blank = [!company && "company", !email && "email", !password && "password"].filter(Boolean);
    if (blank.length > 0) {
      row.error = `Missing ${blank.join(", ")}`;
      continue;
    }
    if (!EMAIL_SHAPE.test(email) || email.length > 128) {
      row.error = "Not a valid email address";
      continue;
    }
    const duplicateOf = firstLineOf.get(email);
    if (duplicateOf !== undefined) {
      row.error = `Same email as line ${duplicateOf}`;
      continue;
    }
    firstLineOf.set(email, line);
    if (password.length < MIN_PASSWORD_LENGTH) {
      row.error = `Password shorter than ${MIN_PASSWORD_LENGTH} characters`;
      continue;
    }
    if (firstName.length > 50 || lastName.length > 50) {
      row.error = "First and last name can be at most 50 characters";
      continue;
    }

    // A choice made in the preview wins over the name. An id that no longer
    // exists (a company deleted meanwhile) is ignored, and the line falls back
    // to matching by name.
    const chosen = choices[row.companyKey] ? companiesById.get(choices[row.companyKey]) : undefined;
    const matches = chosen ? [chosen] : companiesByKey.get(row.companyKey) ?? [];
    if (matches.length === 0) {
      row.error = "No company with this name";
      row.companyProblem = "not_found";
      continue;
    }
    if (matches.length > 1) {
      row.error = "Several companies have this name; choose one";
      row.companyProblem = "ambiguous";
      continue;
    }
    row.companyId = matches[0].id;
    row.companyName = matches[0].name;
    if (chosen) row.companyChosen = true;
    if (firstName) row.firstName = firstName;
    if (lastName) row.lastName = lastName;

    const user = existing.get(email);
    if (!user) {
      row.action = "create";
      continue;
    }
    // A sheet must not be able to take over a VTK staff account: resetting
    // its password or turning it into a representative is done by hand.
    if (user.role_id !== ROLE_COMPANY_REP) {
      row.error = "Belongs to an account that is not a company representative";
      continue;
    }
    if (user.status === "archived") {
      row.error = "Belongs to an archived account";
      continue;
    }
    row.action = "update";
    row.userId = user.id;
    if (user.company_id && user.company_id !== row.companyId) {
      row.movedFrom = user.company?.name ?? "another company";
    }
  }

  return { rows: planned };
}

function toPublicRow({ password: _password, userId: _userId, firstName: _f, lastName: _l, ...row }: PlannedRow): RepImportRow {
  return row;
}

/** What importing this file would do, without changing anything. */
export async function previewRepAccountImport(csvText: string, choices: ImportChoices = {}): Promise<RepImportPlan> {
  const { rows, fileError } = await plan(csvText, choices);
  return { rows: rows.map(toPublicRow), fileError };
}

/**
 * Imports the file, all or nothing. Refuses while any line that is not
 * skipped has a problem, so a typo in one company name cannot leave half an
 * event's accounts made without the admin deciding to leave that line out.
 */
export async function applyRepAccountImport(
  csvText: string,
  choices: ImportChoices = {}
): Promise<{ ok: true; rows: RepImportRow[] } | { ok: false; error: string }> {
  const { rows, fileError } = await plan(csvText, choices);
  if (fileError) return { ok: false, error: fileError };
  const errors = rows.filter((r) => r.action === "error");
  if (errors.length > 0) {
    return { ok: false, error: `${errors.length} line(s) have a problem; fix or skip them first.` };
  }
  if (!rows.some((r) => r.action === "create" || r.action === "update")) {
    return { ok: false, error: "Every line is skipped; there is nothing to import." };
  }

  const writes: RepAccountWrite[] = [];
  // One at a time: argon2id takes 64 MB per hash, and this runs inside the
  // single app container.
  for (const row of rows) {
    if (row.action !== "create" && row.action !== "update") continue;
    const passwordHash = await argon2.hash(row.password, { type: argon2.argon2id });
    writes.push(
      row.action === "create"
        ? {
            kind: "create",
            email: row.email,
            companyId: row.companyId!,
            passwordHash,
            firstName: row.firstName ?? null,
            lastName: row.lastName ?? null,
          }
        : {
            kind: "update",
            userId: row.userId!,
            companyId: row.companyId!,
            passwordHash,
            firstName: row.firstName,
            lastName: row.lastName,
          }
    );
  }
  await writeRepAccounts(writes);
  return { ok: true, rows: rows.map(toPublicRow) };
}
