"use server";

import {
  readItems,
  readItem,
  createItem,
  updateItem,
  deleteItem,
} from "@directus/sdk";
import {
  getDirectusWithToken,
  getServerDirectusClient,
  getAdminDirectusClient,
  directus,
  getServerDirectusClientPreferStatic,
} from "@/lib/directus";
import { getCompaniesBasicByIds } from "@/lib/repos/company";
import type {
  Vacancy,
  VacancyType,
  VacancySector,
  VacancySectionConfig,
  Company,
} from "@/lib/schema";

/**
 * No nested `company.*` — many Directus policies allow direct `company` reads but
 * forbid expanding company fields from `vacancies`. Company rows are merged in a second query.
 */
const VACANCY_READ_FIELDS = [
  "id",
  "status",
  "date_created",
  "date_updated",
  "company",
  "title",
  "type",
  "sector",
  "sectors",
  "location",
  "contact_email",
  "contact_name",
  "contact_phone",
  "sections",
  "type.*",
  "sector.*",
  // Junction → vacancy_sectors: use the field that is UUID in your DB (Directus default: vacancy_sectors_id).
  "sectors.vacancy_sectors_id.*",
  // If you renamed that FK to `sector_id` (UUID) and removed vacancy_sectors_id, swap the line above for:
  // "sectors.sector_id.*",
  "masters.master_id.*",
] as const;

function vacancyCompanyId(v: { company: unknown }): string | null {
  const c = v.company;
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && c !== null && "id" in c) {
    return String((c as { id: string }).id);
  }
  return null;
}

async function getVacancyListReadClient() {
  return (await getDirectusWithToken()) || getAdminDirectusClient() || directus;
}

async function mergeVacancyCompany(
  v: Vacancy,
  opts?: { preferServerToken?: boolean }
): Promise<Vacancy> {
  const cid = vacancyCompanyId(v);
  if (!cid) return v;
  const [row] = await getCompaniesBasicByIds([cid], opts);
  if (!row) return v;
  return {
    ...v,
    company: {
      id: row.id,
      name: row.name ?? "",
      logo: row.logo,
      website: row.website,
    } as Company,
  };
}

async function mergeVacanciesCompanies(vacancies: Vacancy[]): Promise<Vacancy[]> {
  const ids = [
    ...new Set(
      vacancies.map((v) => vacancyCompanyId(v)).filter((x): x is string => !!x)
    ),
  ];
  if (ids.length === 0) return vacancies;
  const companies = await getCompaniesBasicByIds(ids);
  const map = new Map(companies.map((c) => [c.id, c]));
  return vacancies.map((v) => {
    const cid = vacancyCompanyId(v);
    if (!cid) return v;
    const row = map.get(cid);
    if (!row) return v;
    return {
      ...v,
      company: {
        id: row.id,
        name: row.name ?? "",
        logo: row.logo,
        website: row.website,
      } as Company,
    };
  });
}

// ---------------------------------------------------------------------------
// Vacancy CRUD
// ---------------------------------------------------------------------------

export async function listVacancies(opts?: {
  status?: string;
  typeId?: string;
  sectorId?: string;
  masterId?: string;
  location?: string;
  companyId?: string;
  sort?: string;
  limit?: number;
  page?: number;
  usePublic?: boolean;
}) {
  const {
    status,
    typeId,
    sectorId,
    masterId,
    location,
    companyId,
    sort = "-date_created",
    limit = 50,
    page = 1,
  } = opts ?? {};

  const client = await getVacancyListReadClient();
  if (!client) return [];

  const filter: Record<string, unknown> = {};
  if (status) filter.status = { _eq: status };
  if (typeId) filter.type = { _eq: typeId };
  if (sectorId) {
    filter._or = [
      { sector: { _eq: sectorId } },
      { sectors: { sector_id: { _eq: sectorId } } },
      { sectors: { vacancy_sectors_id: { _eq: sectorId } } },
    ];
  }
  if (companyId) filter.company = { _eq: companyId };
  if (location) filter.location = { _contains: location };
  if (masterId) {
    filter.masters = { master_id: { _eq: masterId } };
  }

  const raw = (await client.request(
    readItems("vacancies" as any, {
      fields: [...VACANCY_READ_FIELDS],
      filter: filter as any,
      sort: [sort] as any,
      limit,
      page,
    })
  )) as unknown as Vacancy[];

  return mergeVacanciesCompanies(raw);
}

export async function getVacancyById(
  id: string,
  usePublic = false
): Promise<Vacancy | null> {
  try {
    // Public reads (detail page + contact API): prefer DIRECTUS_SERVER_TOKEN so
    // fields like contact_email are available even when the visitor's JWT has
    // stricter permissions (e.g. students).
    const client = usePublic
      ? await getServerDirectusClientPreferStatic()
      : await getVacancyListReadClient();
    if (!client) return null;

    const raw = (await client.request(
      readItem("vacancies" as any, id, {
        fields: [...VACANCY_READ_FIELDS],
      })
    )) as unknown as Vacancy;

    return mergeVacancyCompany(
      raw,
      usePublic ? { preferServerToken: true } : undefined
    );
  } catch (error) {
    console.error("[getVacancyById] Error:", error);
    return null;
  }
}

/** Junction between vacancies and vacancy_sectors (M2M `sectors`). */
const VACANCIES_SECTORS_JUNCTION =
  process.env.DIRECTUS_VACANCIES_SECTORS_JUNCTION_COLLECTION?.trim() ||
  "vacancies_sectors";

/**
 * FK on that junction pointing at `vacancy_sectors.id`.
 * Directus’s default M2M field is usually `vacancy_sectors_id` (UUID).
 * If you renamed it to `sector_id`, set `DIRECTUS_VACANCY_SECTORS_JUNCTION_FK=sector_id`.
 * If `sector_id` exists as a different (e.g. integer) column, you must use `vacancy_sectors_id` for UUIDs.
 */
const VACANCIES_SECTORS_JUNCTION_FK =
  process.env.DIRECTUS_VACANCY_SECTORS_JUNCTION_FK?.trim() ||
  "vacancy_sectors_id";

/**
 * Optional: comma-separated M2O keys on the junction that all point at `vacancy_sectors`
 * (same UUID is written to each). Use when Studio shows "--" for sectors because the
 * relation reads e.g. `sector_id` while we only filled `vacancy_sectors_id`.
 * Example: `vacancy_sectors_id,sector_id` (only if both columns are UUID FKs).
 */
const VACANCIES_SECTORS_JUNCTION_SECTOR_FKS =
  process.env.DIRECTUS_VACANCIES_SECTORS_JUNCTION_SECTOR_FKS?.trim();

/** FK on the junction pointing at `vacancies.id` (often `vacancies_id`). */
const VACANCIES_SECTORS_JUNCTION_VACANCY_FK =
  process.env.DIRECTUS_VACANCIES_SECTORS_JUNCTION_VACANCY_FK?.trim() ||
  "vacancies_id";

function junctionSectorFkKeys(): string[] {
  if (VACANCIES_SECTORS_JUNCTION_SECTOR_FKS) {
    return VACANCIES_SECTORS_JUNCTION_SECTOR_FKS.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [VACANCIES_SECTORS_JUNCTION_FK];
}

type DirectusClient = NonNullable<Awaited<ReturnType<typeof getDirectusWithToken>>>;

function dedupeSectorIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function sectorIdsFromSectorsPayload(sectors: unknown): string[] | undefined {
  if (!Array.isArray(sectors) || sectors.length === 0) return undefined;
  const ids: string[] = [];
  for (const row of sectors) {
    if (typeof row === "string") {
      ids.push(row);
      continue;
    }
    if (row && typeof row === "object") {
      const o = row as Record<string, unknown>;
      const sid = o.sector_id ?? o.vacancy_sectors_id;
      if (typeof sid === "string") ids.push(sid);
      else if (sid && typeof sid === "object" && "id" in (sid as object)) {
        ids.push(String((sid as { id: string }).id));
      }
    }
  }
  return ids.length ? ids : undefined;
}

/**
 * Removes `sectors` / `sector` from the vacancy payload and optionally returns ids to sync
 * via direct junction writes (nested M2M on `vacancies` is unreliable for multiple rows).
 *
 * `syncSectorIds === undefined` → caller must not touch the junction (field absent).
 * `syncSectorIds === []` → clear all junction rows for this vacancy.
 */
function splitVacancyPayloadForSectorSync(payload: Record<string, unknown>): {
  body: Record<string, unknown>;
  syncSectorIds: string[] | undefined;
} {
  if (!("sectors" in payload)) {
    return { body: { ...payload }, syncSectorIds: undefined };
  }

  const out = { ...payload };
  const raw = out.sectors;
  delete out.sectors;
  delete out.sector;

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    out.sectors = raw;
    return { body: out, syncSectorIds: undefined };
  }

  if (!Array.isArray(raw)) {
    return { body: out, syncSectorIds: undefined };
  }

  if (raw.length === 0) {
    return { body: out, syncSectorIds: [] };
  }

  const parsed = sectorIdsFromSectorsPayload(raw);
  return {
    body: out,
    syncSectorIds: parsed ? dedupeSectorIds(parsed) : [],
  };
}

/**
 * Replace junction rows with `sectorIds` (flat `createItem` per row).
 * Avoids nested `sectors: { create, delete }` on the parent, which often persists only one link.
 */
async function syncVacancySectorsJunction(
  client: DirectusClient,
  vacancyId: string,
  sectorIds: string[]
): Promise<void> {
  const junction = VACANCIES_SECTORS_JUNCTION;
  const vacFk = VACANCIES_SECTORS_JUNCTION_VACANCY_FK;
  const sectorFkKeys = junctionSectorFkKeys();

  const existing = (await client.request(
    readItems(junction as any, {
      filter: { [vacFk]: { _eq: vacancyId } },
      fields: ["id"],
      limit: -1,
    })
  )) as { id: string | number }[];

  for (const row of existing) {
    await client.request(deleteItem(junction as any, row.id));
  }

  for (const sid of sectorIds) {
    const row: Record<string, unknown> = {
      [vacFk]: vacancyId,
    };
    for (const fk of sectorFkKeys) {
      row[fk] = { id: sid };
    }

    try {
      await client.request(createItem(junction as any, row as any));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/invalid input syntax for type integer.*[0-9a-f-]{36}/i.test(msg)) {
        const primary = sectorFkKeys[0] ?? VACANCIES_SECTORS_JUNCTION_FK;
        console.error(
          "[vacancies_sectors] UUID was rejected as integer — wrong junction FK or dual-FK env lists a non-UUID column. " +
            `Sector keys used: ${sectorFkKeys.join(", ") || primary}. ` +
            "See DIRECTUS_VACANCIES.md (junction troubleshooting)."
        );
      }
      throw e;
    }
  }
}

export async function createVacancy(
  payload: Partial<Vacancy>
): Promise<Vacancy | null> {
  const client = await getDirectusWithToken();
  if (!client) return null;

  const { body, syncSectorIds } = splitVacancyPayloadForSectorSync({
    ...(payload as Record<string, unknown>),
  });

  const created = (await client.request(
    createItem("vacancies" as any, body as any)
  )) as unknown as Vacancy;

  if (syncSectorIds !== undefined && created?.id) {
    try {
      await syncVacancySectorsJunction(client, created.id, syncSectorIds);
    } catch (e) {
      console.error("[createVacancy] Junction sector sync failed:", e);
      throw e;
    }
  }

  return created;
}

export async function updateVacancy(
  id: string,
  payload: Partial<Vacancy>
): Promise<Vacancy | null> {
  const client = await getDirectusWithToken();
  if (!client) return null;

  const { body, syncSectorIds } = splitVacancyPayloadForSectorSync({
    ...(payload as Record<string, unknown>),
  });

  const updated = (await client.request(
    updateItem("vacancies" as any, id, body as any)
  )) as unknown as Vacancy;

  if (syncSectorIds !== undefined) {
    try {
      await syncVacancySectorsJunction(client, id, syncSectorIds);
    } catch (e) {
      console.error("[updateVacancy] Junction sector sync failed:", e);
      throw e;
    }
  }

  return updated;
}

export async function deleteVacancy(id: string): Promise<void> {
  const client = await getDirectusWithToken();
  if (!client) return;

  await client.request(deleteItem("vacancies" as any, id));
}

// ---------------------------------------------------------------------------
// Vacancy Types
// ---------------------------------------------------------------------------

export async function listVacancyTypes(
  activeOnly = true
): Promise<VacancyType[]> {
  const client = await getServerDirectusClient();
  if (!client) return [];

  const filter: Record<string, unknown> = {};
  if (activeOnly) filter.active = { _eq: true };

  return (await client.request(
    readItems("vacancy_types" as any, {
      fields: ["*"],
      filter: filter as any,
      sort: ["sort"] as any,
      limit: -1,
    })
  )) as unknown as VacancyType[];
}

export async function createVacancyType(
  payload: Partial<VacancyType>
): Promise<VacancyType | null> {
  const client = await getAdminDirectusClient();
  if (!client) return null;

  return (await client.request(
    createItem("vacancy_types" as any, payload as any)
  )) as unknown as VacancyType;
}

export async function updateVacancyType(
  id: string,
  payload: Partial<VacancyType>
): Promise<VacancyType | null> {
  const client = await getAdminDirectusClient();
  if (!client) return null;

  return (await client.request(
    updateItem("vacancy_types" as any, id, payload as any)
  )) as unknown as VacancyType;
}

export async function deleteVacancyType(id: string): Promise<void> {
  const client = await getAdminDirectusClient();
  if (!client) return;

  await client.request(deleteItem("vacancy_types" as any, id));
}

// ---------------------------------------------------------------------------
// Vacancy Sectors
// ---------------------------------------------------------------------------

export async function listVacancySectors(
  activeOnly = true
): Promise<VacancySector[]> {
  const client = await getServerDirectusClient();
  if (!client) return [];

  const filter: Record<string, unknown> = {};
  if (activeOnly) filter.active = { _eq: true };

  return (await client.request(
    readItems("vacancy_sectors" as any, {
      fields: ["*"],
      filter: filter as any,
      sort: ["sort"] as any,
      limit: -1,
    })
  )) as unknown as VacancySector[];
}

export async function createVacancySector(
  payload: Partial<VacancySector>
): Promise<VacancySector | null> {
  const client = await getAdminDirectusClient();
  if (!client) return null;

  return (await client.request(
    createItem("vacancy_sectors" as any, payload as any)
  )) as unknown as VacancySector;
}

export async function updateVacancySector(
  id: string,
  payload: Partial<VacancySector>
): Promise<VacancySector | null> {
  const client = await getAdminDirectusClient();
  if (!client) return null;

  return (await client.request(
    updateItem("vacancy_sectors" as any, id, payload as any)
  )) as unknown as VacancySector;
}

export async function deleteVacancySector(id: string): Promise<void> {
  const client = await getAdminDirectusClient();
  if (!client) return;

  await client.request(deleteItem("vacancy_sectors" as any, id));
}

// ---------------------------------------------------------------------------
// Vacancy Section Configs
// ---------------------------------------------------------------------------

export async function listVacancySectionConfigs(
  activeOnly = true
): Promise<VacancySectionConfig[]> {
  const client = await getServerDirectusClient();
  if (!client) return [];

  const filter: Record<string, unknown> = {};
  if (activeOnly) filter.active = { _eq: true };

  return (await client.request(
    readItems("vacancy_section_config" as any, {
      fields: ["*"],
      filter: filter as any,
      sort: ["sort"] as any,
      limit: -1,
    })
  )) as unknown as VacancySectionConfig[];
}

export async function createVacancySectionConfig(
  payload: Partial<VacancySectionConfig>
): Promise<VacancySectionConfig | null> {
  const client = await getAdminDirectusClient();
  if (!client) return null;

  return (await client.request(
    createItem("vacancy_section_config" as any, payload as any)
  )) as unknown as VacancySectionConfig;
}

export async function updateVacancySectionConfig(
  id: string,
  payload: Partial<VacancySectionConfig>
): Promise<VacancySectionConfig | null> {
  const client = await getAdminDirectusClient();
  if (!client) return null;

  return (await client.request(
    updateItem("vacancy_section_config" as any, id, payload as any)
  )) as unknown as VacancySectionConfig;
}

export async function deleteVacancySectionConfig(id: string): Promise<void> {
  const client = await getAdminDirectusClient();
  if (!client) return;

  await client.request(deleteItem("vacancy_section_config" as any, id));
}
