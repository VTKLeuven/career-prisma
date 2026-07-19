"use server";

import { prisma } from "@/lib/prisma";
import { shapeMaster } from "@/lib/repos/_shape";
import type {
  Vacancy,
  VacancyType,
  VacancySector,
  VacancySectionConfig,
} from "@/lib/schema";

/**
 * The Directus implementation carried three workarounds that are gone here:
 *
 *  - The sectors junction FK name was configurable through
 *    DIRECTUS_VACANCY_SECTORS_JUNCTION_FK / _SECTOR_FKS because nobody was sure
 *    which column the junction used. It is vacancies_vacancy_sectors.
 *    vacancy_sectors_id; those env vars are no longer read.
 *  - Company data was fetched in a second query and merged in, because Directus
 *    policies allowed a direct `company` read but forbade expanding
 *    `company.*` from `vacancies`. It is now a plain include.
 *  - Sector filtering tried three spellings at once (sector, sectors.sector_id,
 *    sectors.vacancy_sectors_id).
 */

const VACANCY_INCLUDE = {
  company: { select: { id: true, name: true, logo_id: true, website: true } },
  type: true,
  sector: true,
  vacancySectorLinks: { include: { vacancySectors: true } },
  vacancyMasters: { include: { master: true } },
} as const;

function shapeVacancy(row: Record<string, any> | null): Vacancy | null {
  if (!row) return null;
  const {
    company,
    company_id,
    type_id,
    sector_id,
    vacancySectorLinks,
    vacancyMasters,
    ...rest
  } = row;

  return {
    ...rest,
    company: company
      ? { id: company.id, name: company.name ?? "", logo: company.logo_id, website: company.website }
      : (company_id ?? null),
    sectors: (vacancySectorLinks ?? [])
      .filter((l: any) => l.vacancySectors)
      .map((l: any) => ({ vacancy_sectors_id: l.vacancySectors })),
    masters: (vacancyMasters ?? [])
      .filter((m: any) => m.master)
      .map((m: any) => ({ master_id: shapeMaster(m.master) })),
  } as Vacancy;
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

  const desc = sort.startsWith("-");
  const sortField = desc ? sort.slice(1) : sort;

  const rows = await prisma.vacancy.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(typeId ? { type_id: typeId } : {}),
      ...(companyId ? { company_id: companyId } : {}),
      ...(location ? { location: { contains: location, mode: "insensitive" } } : {}),
      ...(masterId
        ? { vacancyMasters: { some: { master_id: Number(masterId) } } }
        : {}),
      // A vacancy matches a sector through either the legacy single FK or the
      // many-to-many junction.
      ...(sectorId
        ? {
            OR: [
              { sector_id: sectorId },
              { vacancySectorLinks: { some: { vacancy_sectors_id: sectorId } } },
            ],
          }
        : {}),
    },
    include: VACANCY_INCLUDE,
    orderBy: { [sortField]: desc ? "desc" : "asc" },
    take: limit,
    skip: (page - 1) * limit,
  });

  return rows.map((r) => shapeVacancy(r)!) as Vacancy[];
}

export async function getVacancyById(
  id: string,
  _usePublic = false
): Promise<Vacancy | null> {
  try {
    const row = await prisma.vacancy.findUnique({
      where: { id },
      include: VACANCY_INCLUDE,
    });
    return shapeVacancy(row);
  } catch (error) {
    console.error("[getVacancyById] Error:", error);
    return null;
  }
}

/**
 * Callers write `sectors` either as bare ids or as junction rows keyed by
 * `sector_id` / `vacancy_sectors_id`. Both are accepted.
 */
function sectorIdsFromPayload(sectors: unknown): string[] | undefined {
  if (!Array.isArray(sectors)) return undefined;
  const ids: string[] = [];
  for (const row of sectors) {
    if (typeof row === "string") {
      ids.push(row);
    } else if (row && typeof row === "object") {
      const o = row as Record<string, unknown>;
      const sid = o.sector_id ?? o.vacancy_sectors_id;
      if (typeof sid === "string") ids.push(sid);
      else if (sid && typeof sid === "object" && "id" in (sid as object)) {
        ids.push(String((sid as { id: string }).id));
      }
    }
  }
  return [...new Set(ids.filter(Boolean))];
}

function masterIdsFromPayload(masters: unknown): number[] | undefined {
  if (!Array.isArray(masters)) return undefined;
  const ids: number[] = [];
  for (const row of masters) {
    const v =
      row && typeof row === "object"
        ? (row as Record<string, any>).master_id ?? row
        : row;
    const id = v && typeof v === "object" ? v.id : v;
    const n = Number(id);
    if (Number.isFinite(n)) ids.push(n);
  }
  return [...new Set(ids)];
}

/** Splits a legacy write payload into scalar columns and relation ids. */
function splitVacancyPayload(payload: Partial<Vacancy>) {
  const {
    company,
    type,
    sector,
    sectors,
    masters,
    id: _id,
    ...rest
  } = payload as Record<string, any>;

  const idOf = (v: any) => (v && typeof v === "object" ? v.id : v) ?? null;

  return {
    scalars: {
      ...rest,
      ...(company !== undefined ? { company_id: idOf(company) } : {}),
      ...(type !== undefined ? { type_id: idOf(type) } : {}),
      ...(sector !== undefined ? { sector_id: idOf(sector) } : {}),
    } as Record<string, unknown>,
    sectorIds: sectorIdsFromPayload(sectors),
    masterIds: masterIdsFromPayload(masters),
  };
}

export async function createVacancy(
  payload: Partial<Vacancy>
): Promise<Vacancy | null> {
  const { scalars, sectorIds, masterIds } = splitVacancyPayload(payload);

  const row = await prisma.vacancy.create({
    data: {
      ...(scalars as any),
      date_created: new Date(),
      ...(sectorIds?.length
        ? {
            vacancySectorLinks: {
              create: sectorIds.map((vacancy_sectors_id) => ({ vacancy_sectors_id })),
            },
          }
        : {}),
      ...(masterIds?.length
        ? { vacancyMasters: { create: masterIds.map((master_id) => ({ master_id })) } }
        : {}),
    },
    include: VACANCY_INCLUDE,
  });

  return shapeVacancy(row);
}

export async function updateVacancy(
  id: string,
  payload: Partial<Vacancy>
): Promise<Vacancy | null> {
  const { scalars, sectorIds, masterIds } = splitVacancyPayload(payload);

  const row = await prisma.$transaction(async (tx) => {
    await tx.vacancy.update({
      where: { id },
      data: { ...(scalars as any), date_updated: new Date() },
    });

    // Relations are only replaced when the caller actually supplied them.
    if (sectorIds) {
      await tx.vacancySectorLink.deleteMany({ where: { vacancies_id: id } });
      if (sectorIds.length) {
        await tx.vacancySectorLink.createMany({
          data: sectorIds.map((vacancy_sectors_id) => ({
            vacancies_id: id,
            vacancy_sectors_id,
          })),
        });
      }
    }

    if (masterIds) {
      await tx.vacancyMaster.deleteMany({ where: { vacancies_id: id } });
      if (masterIds.length) {
        await tx.vacancyMaster.createMany({
          data: masterIds.map((master_id) => ({ vacancies_id: id, master_id })),
        });
      }
    }

    return tx.vacancy.findUnique({ where: { id }, include: VACANCY_INCLUDE });
  });

  return shapeVacancy(row);
}

export async function deleteVacancy(id: string): Promise<void> {
  // The junctions have no cascade, so their rows go first.
  await prisma.$transaction(async (tx) => {
    await tx.vacancySectorLink.deleteMany({ where: { vacancies_id: id } });
    await tx.vacancyMaster.deleteMany({ where: { vacancies_id: id } });
    await tx.vacancy.delete({ where: { id } });
  });
}

// ---------------------------------------------------------------------------
// Vacancy Types
// ---------------------------------------------------------------------------
// The `activeOnly` default of true is what enforces the old Directus public
// policy (active = true); Prisma has no policy layer behind it.

export async function listVacancyTypes(
  activeOnly = true
): Promise<VacancyType[]> {
  return (await prisma.vacancyType.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { sort: "asc" },
  })) as unknown as VacancyType[];
}

export async function createVacancyType(
  payload: Partial<VacancyType>
): Promise<VacancyType | null> {
  const { id: _id, ...rest } = payload as Record<string, any>;
  return (await prisma.vacancyType.create({ data: rest })) as unknown as VacancyType;
}

export async function updateVacancyType(
  id: string,
  payload: Partial<VacancyType>
): Promise<VacancyType | null> {
  const { id: _id, ...rest } = payload as Record<string, any>;
  return (await prisma.vacancyType.update({
    where: { id },
    data: rest,
  })) as unknown as VacancyType;
}

export async function deleteVacancyType(id: string): Promise<void> {
  await prisma.vacancyType.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Vacancy Sectors
// ---------------------------------------------------------------------------

export async function listVacancySectors(
  activeOnly = true
): Promise<VacancySector[]> {
  return (await prisma.vacancySector.findMany({
    where: activeOnly ? { active: true } : undefined,
    // `sort` is a varchar on this table (an int on vacancy_types), so this is a
    // lexicographic ordering -- unchanged from the Directus behaviour.
    orderBy: { sort: "asc" },
  })) as unknown as VacancySector[];
}

export async function createVacancySector(
  payload: Partial<VacancySector>
): Promise<VacancySector | null> {
  const { id: _id, ...rest } = payload as Record<string, any>;
  return (await prisma.vacancySector.create({ data: rest })) as unknown as VacancySector;
}

export async function updateVacancySector(
  id: string,
  payload: Partial<VacancySector>
): Promise<VacancySector | null> {
  const { id: _id, ...rest } = payload as Record<string, any>;
  return (await prisma.vacancySector.update({
    where: { id },
    data: rest,
  })) as unknown as VacancySector;
}

export async function deleteVacancySector(id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.vacancySectorLink.deleteMany({ where: { vacancy_sectors_id: id } });
    await tx.vacancySector.delete({ where: { id } });
  });
}

// ---------------------------------------------------------------------------
// Vacancy Section Configs
// ---------------------------------------------------------------------------

export async function listVacancySectionConfigs(
  activeOnly = true
): Promise<VacancySectionConfig[]> {
  return (await prisma.vacancySectionConfig.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { sort: "asc" },
  })) as unknown as VacancySectionConfig[];
}

export async function createVacancySectionConfig(
  payload: Partial<VacancySectionConfig>
): Promise<VacancySectionConfig | null> {
  const { id: _id, ...rest } = payload as Record<string, any>;
  return (await prisma.vacancySectionConfig.create({
    data: rest,
  })) as unknown as VacancySectionConfig;
}

export async function updateVacancySectionConfig(
  id: string,
  payload: Partial<VacancySectionConfig>
): Promise<VacancySectionConfig | null> {
  const { id: _id, ...rest } = payload as Record<string, any>;
  return (await prisma.vacancySectionConfig.update({
    where: { id },
    data: rest,
  })) as unknown as VacancySectionConfig;
}

export async function deleteVacancySectionConfig(id: string): Promise<void> {
  await prisma.vacancySectionConfig.delete({ where: { id } });
}
