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
  "location",
  "contact_email",
  "contact_name",
  "contact_phone",
  "sections",
  "type.*",
  "sector.*",
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

async function mergeVacancyCompany(v: Vacancy): Promise<Vacancy> {
  const cid = vacancyCompanyId(v);
  if (!cid) return v;
  const [row] = await getCompaniesBasicByIds([cid]);
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
  if (sectorId) filter.sector = { _eq: sectorId };
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
  _usePublic = false
): Promise<Vacancy | null> {
  try {
    const client = await getVacancyListReadClient();
    if (!client) return null;

    const raw = (await client.request(
      readItem("vacancies" as any, id, {
        fields: [...VACANCY_READ_FIELDS],
      })
    )) as unknown as Vacancy;

    return mergeVacancyCompany(raw);
  } catch (error) {
    console.error("[getVacancyById] Error:", error);
    return null;
  }
}

export async function createVacancy(
  payload: Partial<Vacancy>
): Promise<Vacancy | null> {
  const client = await getDirectusWithToken();
  if (!client) return null;

  return (await client.request(
    createItem("vacancies" as any, payload as any)
  )) as unknown as Vacancy;
}

export async function updateVacancy(
  id: string,
  payload: Partial<Vacancy>
): Promise<Vacancy | null> {
  const client = await getDirectusWithToken();
  if (!client) return null;

  return (await client.request(
    updateItem("vacancies" as any, id, payload as any)
  )) as unknown as Vacancy;
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
