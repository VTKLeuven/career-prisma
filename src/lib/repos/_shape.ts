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

/** PostgreSQL `date`/`time` values are Date objects in Prisma, while the
 * compatibility API promises the strings Directus returned. */
export function shapeDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function shapeTime(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(11, 19);
  const text = String(value);
  const isoTime = text.match(/T(\d{2}:\d{2}:\d{2})/);
  return isoTime?.[1] ?? text;
}

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
      (r: any) => shapeCareerEvent(r.careerEvent)
    ),
    sub_options: junction(
      careerEventOptionSubOptions,
      "career_sub_option_id",
      (r: any) => r.careerSubOption
    ),
  };
}

/** Career-event dates and hours were plain strings in the Directus API. */
export function shapeCareerEvent(row: Nullable<CompanyRow>): any {
  if (!row) return null;
  const {
    date,
    start_hour,
    end_hour,
    image_id,
    image: _image,
    careerEventOptionEvents: _careerEventOptionEvents,
    ...rest
  } = row;
  return {
    ...rest,
    date: shapeDate(date),
    start_hour: shapeTime(start_hour),
    end_hour: shapeTime(end_hour),
    image: image_id ?? null,
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

/** Speaker with its representative (and that person's company) expanded. */
export const SPEAKER_INCLUDE = {
  representative: { include: { company: true } },
  time: true,
} as const;

export function shapeSpeaker(row: Nullable<CompanyRow>): any {
  if (!row) return null;
  const { representative_id, time_id, representative, time, ...rest } = row;
  return {
    ...rest,
    time: shapeTimetable(time),
    representative: representative
      ? {
          ...representative,
          avatar: representative.avatar ?? null,
          company: representative.company
            ? {
                ...representative.company,
                logo: representative.company.logo_id ?? null,
              }
            : null,
        }
      : null,
  };
}

/** Timetable hours are also exposed as Directus-style `HH:mm:ss` strings. */
export function shapeTimetable(row: Nullable<CompanyRow>): any {
  if (!row) return null;
  const { start_time, end_time, speaker, ...rest } = row;
  return {
    ...rest,
    start_time: shapeTime(start_time),
    end_time: shapeTime(end_time),
    ...(speaker !== undefined ? { speaker: shapeSpeaker(speaker) } : {}),
  };
}

/**
 * Everything an event page needs.
 *
 * Note `careerEventPageTimetables` rather than `timetableCareerEventPages`:
 * two junction tables link these models, and Directus' relation metadata shows
 * career_event_page_timetable backs the `timetable` alias (48 rows) while
 * timetable_career_event_page backs `timetable.events` (33 rows).
 */
export const EVENT_PAGE_INCLUDE = {
  event: true,
  floorplan: true,
  careerEventPageTimetables: {
    include: { timetable: { include: { speaker: { include: SPEAKER_INCLUDE } } } },
    orderBy: { timetable: { start_time: "asc" } },
  },
  careerEventPageCompanies: { include: { company: { include: COMPANY_INCLUDE } } },
  careerEventPageSpeakers: { include: { speaker: { include: SPEAKER_INCLUDE } } },
} as const;

/** Maps a Prisma event page into the junction-wrapped shape actions/events.ts flattens. */
export function shapeEventPage(row: Nullable<CompanyRow>): any {
  if (!row) return null;
  const {
    event_id,
    event,
    image_id,
    floorplan_id,
    image,
    companyGuide,
    careerEventPageTimetables,
    careerEventPageCompanies,
    careerEventPageSpeakers,
    ...rest
  } = row;

  return {
    ...rest,
    event: shapeCareerEvent(event),
    // Consumers pass these straight to getFileUrl / check for a string.
    image: image_id ?? null,
    timetable: junction(careerEventPageTimetables, "timetable_id", (r: any) =>
      shapeTimetable(r.timetable)
    ),
    companies: junction(careerEventPageCompanies, "company_id", (r: any) =>
      shapeCompany(r.company)
    ),
    speakers: junction(careerEventPageSpeakers, "speaker_id", (r: any) =>
      shapeSpeaker(r.speaker)
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
