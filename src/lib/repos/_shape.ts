// lib/repos/_shape.ts
//
// Directus returned many-to-many relations as arrays of junction rows, so the
// rest of the application reads shapes like:
//
//   company.options  -> [{ career_event_option_id: { …option } }]
//   company.category -> [{ master_id: { …master } }]
//
// Prisma returns the junction rows too, but names the nested relation after the
// model (`careerEventOption`, `master`). Rather than rewrite every consumer,
// the repos map Prisma results back into the shapes those consumers already
// expect. This keeps the Directus removal confined to src/lib/repos.
//
// These mappers are the one place that knows about the old shape. When a
// consumer is eventually updated to read Prisma's shape directly, delete the
// corresponding mapper rather than adding a second variant.

type Nullable<T> = T | null | undefined;

/** Wraps a list of junction rows back into Directus' `{ <fk>: <entity> }` form. */
function junction<Row, Key extends string>(
  rows: Nullable<Row[]>,
  key: Key,
  pick: (row: Row) => unknown
): Array<Record<Key, unknown>> {
  if (!rows?.length) return [];
  return rows
    .map((row) => pick(row))
    .filter((v) => v != null)
    .map((v) => ({ [key]: v }) as Record<Key, unknown>);
}

/** The Prisma `include` that produces everything the legacy Company shape needs. */
export const COMPANY_INCLUDE = {
  users: true,
  salesperson: { select: { id: true, first_name: true, last_name: true } },
  companyMasters: { include: { master: true } },
  companyCareerSubOptions: { include: { careerSubOption: true } },
  companyCareerEventOptions: {
    include: {
      careerEventOption: {
        include: {
          careerEventOptionEvents: { include: { careerEvent: true } },
          careerEventOptionSubOptions: { include: { careerSubOption: true } },
        },
      },
    },
  },
} as const;

type CompanyRow = Record<string, any>;

/** Maps a Prisma company (loaded with COMPANY_INCLUDE) to the legacy shape. */
export function shapeCompany(row: Nullable<CompanyRow>): any {
  if (!row) return null;

  const {
    users,
    salesperson,
    companyMasters,
    companyCareerSubOptions,
    companyCareerEventOptions,
    logo_id,
    page_image_id,
    salesperson_id,
    ...rest
  } = row;

  return {
    ...rest,
    // Directus exposed these as bare file/user ids under the un-suffixed name.
    logo: logo_id ?? null,
    page_image: page_image_id ?? null,
    salesperson: salesperson ?? salesperson_id ?? null,

    representatives: users ?? [],
    category: junction(companyMasters, "master_id", (r: any) => r.master),
    sub_options: junction(
      companyCareerSubOptions,
      "career_sub_option_id",
      (r: any) => r.careerSubOption
    ),
    options: junction(
      companyCareerEventOptions,
      "career_event_option_id",
      (r: any) => shapeCareerEventOption(r.careerEventOption)
    ),
  };
}

/** Maps a Prisma career event option, including its nested junctions. */
export function shapeCareerEventOption(row: Nullable<CompanyRow>): any {
  if (!row) return null;
  const { careerEventOptionEvents, careerEventOptionSubOptions, ...rest } = row;
  return {
    ...rest,
    events: junction(
      careerEventOptionEvents,
      "career_event_id",
      (r: any) => r.careerEvent
    ),
    sub_options: junction(
      careerEventOptionSubOptions,
      "career_sub_option_id",
      (r: any) => r.careerSubOption
    ),
  };
}

/** Maps a Prisma order (loaded with ORDER_INCLUDE) to the legacy shape. */
export function shapeOrder(row: Nullable<CompanyRow>): any {
  if (!row) return null;
  const { booth, shifter, booth_id, shifter_id, ...rest } = row;
  return {
    ...rest,
    booth: booth ? shapeBooth(booth) : (booth_id ?? null),
    shifter: shifter ?? shifter_id ?? null,
  };
}

export const ORDER_INCLUDE = {
  booth: { include: { company: true } },
  shifter: true,
} as const;

/** Maps a Prisma booth to the legacy shape (`Floorplan`, `company`). */
export function shapeBooth(row: Nullable<CompanyRow>): any {
  if (!row) return null;
  const { floorplan_id, company_id, floorplan, company, ...rest } = row;
  return {
    ...rest,
    company: company ? shapeCompany(company) : (company_id ?? null),
    // The legacy schema spells this field `Floorplan` on Booth.
    Floorplan: floorplan ?? floorplan_id ?? null,
  };
}

/** `logo` was a bare file id in the Directus payload, not an expanded object. */
export function shapeMaster(row: Nullable<CompanyRow>): any {
  if (!row) return null;
  const { logo_id, logo, ...rest } = row;
  return { ...rest, logo: logo_id ?? null };
}

export const FACULTY_INCLUDE = {
  facultyMasters: { include: { master: true } },
} as const;

/** Faculty.masters is junction-wrapped: `[{ master_id: Master }]`. */
export function shapeFaculty(row: Nullable<CompanyRow>): any {
  if (!row) return null;
  const { logo_id, logo, facultyMasters, ...rest } = row;
  return {
    ...rest,
    logo: logo_id ?? null,
    masters: junction(facultyMasters, "master_id", (r: any) =>
      r.master ? shapeMaster(r.master) : null
    ),
  };
}

/** Schedule keeps `event` and `pdf` as bare ids; `master` is expanded. */
export function shapeSchedule(row: Nullable<CompanyRow>): any {
  if (!row) return null;
  const { event_id, pdf_id, master_id, event, pdf, master, ...rest } = row;
  return {
    ...rest,
    event: event_id ?? null,
    pdf: pdf_id ?? null,
    master: master ? shapeMaster(master) : (master_id ?? null),
  };
}
