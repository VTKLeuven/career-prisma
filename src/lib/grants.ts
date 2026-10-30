// lib/grants.ts -- what buying a sub-option gives a company.
//
// A sub-option can carry grants (career_sub_option_grants): rows of a `type`
// plus a JSON `config`. The table knows nothing about any feature; this file
// is where a type gets its meaning. Adding a kind of access is adding an entry
// here and the check that reads it -- no migration. A type the database holds
// but this list does not know is ignored, so a newer deploy's rows cannot
// break an older image.
//
// Shared by server and client: the admin form renders from it, and the access
// checks in lib/utils/company-access.ts read the types a company holds.

/** How long a grant lasts once the sub-option is sold. */
export type GrantDuration =
  /** Only during the academic year of the sale -- the old name-based behaviour. */
  | "sale_year"
  /** For good: a CV book bought once stays open. */
  | "forever";

/**
 * Which CV books a `cv_book` grant opens: the book of the year the sub-option
 * is sold in, or specific books by id -- how an older book is sold. Ids are
 * not foreign keys (they live in JSON); a deleted book just opens nothing.
 */
export type CVBookGrantConfig =
  | { scope: "sale_year" }
  | { scope: "books"; bookIds: number[] };

type GrantDefinition = {
  label: string;
  description: string;
  duration: GrantDuration;
  /** Checks a config from the admin form or the database; returns the clean value or throws. */
  parseConfig: (config: unknown) => unknown;
};

const noConfig = () => null;

export const GRANT_TYPES = {
  cv_book: {
    label: "CV book",
    description: "Open CV books in the company dashboard. Kept for good once bought.",
    duration: "forever",
    parseConfig: (config: unknown): CVBookGrantConfig => {
      const c = (config ?? {}) as { scope?: unknown; bookIds?: unknown };
      if (c.scope === "books") {
        const ids = Array.isArray(c.bookIds) ? c.bookIds.map(Number) : [];
        if (ids.length === 0 || ids.some((id) => !Number.isSafeInteger(id))) {
          throw new Error("Pick at least one CV book for this sub-option to grant.");
        }
        return { scope: "books", bookIds: Array.from(new Set(ids)) };
      }
      return { scope: "sale_year" };
    },
  },
  company_page: {
    label: "Company page",
    description:
      "A public page on the website (/company/<name>), for the year it is sold. The company must also be published.",
    duration: "sale_year",
    parseConfig: noConfig,
  },
  vacancies: {
    label: "Vacancy platform",
    description: "Post vacancies from the company dashboard, for the year it is sold.",
    duration: "sale_year",
    parseConfig: noConfig,
  },
  matching_software: {
    label: "Matching software",
    description: "See the students matched to the company, for the year it is sold.",
    duration: "sale_year",
    parseConfig: noConfig,
  },
  student_schedules: {
    label: "Student schedules",
    description: "Download student schedules from the dashboard, for the year it is sold.",
    duration: "sale_year",
    parseConfig: noConfig,
  },
  extra_booth: {
    label: "Extra booth",
    description: "A second booth on the floorplan, for the year it is sold.",
    duration: "sale_year",
    parseConfig: noConfig,
  },
} satisfies Record<string, GrantDefinition>;

export type GrantType = keyof typeof GRANT_TYPES;

/** One grant as the admin form edits it and the sub-option actions save it. */
export type SubOptionGrant = { type: GrantType; config: unknown };

export function isGrantType(type: unknown): type is GrantType {
  return typeof type === "string" && Object.prototype.hasOwnProperty.call(GRANT_TYPES, type);
}

/**
 * The grants a sub-option form sent, checked: known types only, one per type,
 * each config parsed by its type. Throws with a message the form can show.
 */
export function parseSubOptionGrants(input: unknown): SubOptionGrant[] {
  if (input == null || input === "") return [];
  if (!Array.isArray(input)) throw new Error("Invalid grants");
  const seen = new Set<string>();
  const grants: SubOptionGrant[] = [];
  for (const raw of input) {
    const type = (raw as { type?: unknown })?.type;
    if (!isGrantType(type)) throw new Error(`Unknown grant type: ${String(type)}`);
    if (seen.has(type)) continue;
    seen.add(type);
    grants.push({ type, config: GRANT_TYPES[type].parseConfig((raw as { config?: unknown }).config) });
  }
  return grants;
}
