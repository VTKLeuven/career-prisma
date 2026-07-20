// lib/repos/company.ts
"use server"

import { prisma } from "@/lib/prisma";
import { COMPANY_INCLUDE, shapeCompany } from "@/lib/repos/_shape";
import type { Company } from "@/lib/schema";

/** Minimal company shape for vacancy cards / public listing. */
export type CompanyBasicForVacancy = Pick<Company, "id" | "name" | "logo" | "website">;

/**
 * Load companies by id.
 *
 * The `opts` parameter is retained for call-site compatibility. Under Directus
 * it selected which client (user JWT / server token / public) to use, because
 * policies allowed a direct `company` read while forbidding the same fields
 * when expanded from `vacancies`. Prisma has no such policy layer, so a single
 * query serves every caller.
 */
export async function getCompaniesBasicByIds(
  ids: string[],
  _opts?: { preferServerToken?: boolean }
): Promise<CompanyBasicForVacancy[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  try {
    const rows = await prisma.company.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true, logo_id: true, website: true },
    });

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      logo: r.logo_id,
      website: r.website,
    })) as CompanyBasicForVacancy[];
  } catch (err) {
    console.error("[getCompaniesBasicByIds] Error:", err);
    return [];
  }
}

/** id + name for company dropdowns. */
export async function listCompaniesBasic(): Promise<{ id: string; name: string | null }[]> {
  try {
    return await prisma.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("[listCompaniesBasic]", error);
    return [];
  }
}

export async function listCompanies(opts?: {
  search?: string;
  limit?: number;
  page?: number;        // 1-based
  sort?: string;        // e.g. "-date_created" or "name"
  usePublic?: boolean;  // retained for compatibility; no longer meaningful
  useServerClient?: boolean;
}) {
  try {
    const { search, limit = 25, page = 1, sort = "name" } = opts ?? {};

    // Directus sort syntax: a leading "-" means descending.
    const desc = sort.startsWith("-");
    const sortField = desc ? sort.slice(1) : sort;

    const rows = await prisma.company.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { short_description: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: COMPANY_INCLUDE,
      orderBy: { [sortField]: desc ? "desc" : "asc" },
      take: limit,
      skip: (page - 1) * limit,
    });

    return rows.map(shapeCompany) as Company[];
  } catch (error) {
    console.error("[listCompanies]", error);
    return null;
  }
}

export async function getCompanyById(
  id: string,
  _usePublic = false,
  _retries = 2,
  _useServerClient = false
) {
  try {
    const row = await prisma.company.findUnique({
      where: { id },
      include: COMPANY_INCLUDE,
    });
    return shapeCompany(row) as Company | null;
  } catch (error) {
    console.error(`[getCompanyById] Error fetching company ${id}:`, error);
    return null;
  }
}

export async function createCompany(payload: Partial<Company>) {
  const row = await prisma.company.create({
    data: toCompanyWrite(payload),
    include: COMPANY_INCLUDE,
  });
  return shapeCompany(row) as Company;
}

export async function updateCompany(id: string, payload: Partial<Company>) {
  const row = await prisma.company.update({
    where: { id },
    data: { ...toCompanyWrite(payload), date_updated: new Date() },
    include: COMPANY_INCLUDE,
  });
  return shapeCompany(row) as Company;
}

/**
 * Translates the legacy write shape into Prisma columns. Callers still pass
 * `logo` / `page_image` / `salesperson` as bare ids, which are now `*_id`
 * columns. Relational fields (representatives, category, options) are managed
 * through their own repos and are ignored here.
 */
function toCompanyWrite(payload: Partial<Company>): Record<string, unknown> {
  const {
    logo,
    page_image,
    salesperson,
    representatives: _representatives,
    category: _category,
    options: _options,
    id: _id,
    ...rest
  } = payload as Record<string, any>;

  return {
    ...rest,
    ...(logo !== undefined ? { logo_id: logo || null } : {}),
    ...(page_image !== undefined ? { page_image: page_image || null } : {}),
    ...(salesperson !== undefined
      ? {
          salesperson_id:
            salesperson && typeof salesperson === "object"
              ? salesperson.id
              : salesperson || null,
        }
      : {}),
  };
}

/**
 * Companies registered for an event: those holding an option linked to it.
 *
 * Directus could not express this, so the previous implementation fetched every
 * company with five levels of nested expansion and filtered in JavaScript. The
 * relation is a plain join, so the database can answer it directly.
 */
export async function getCompaniesForEvent(eventId: string, _usePublic = false) {
  try {
    const rows = await prisma.company.findMany({
      where: {
        companyCareerEventOptions: {
          some: {
            careerEventOption: {
              careerEventOptionEvents: { some: { career_event_id: eventId } },
            },
          },
        },
      },
      include: COMPANY_INCLUDE,
      orderBy: { name: "asc" },
    });

    return rows.map(shapeCompany) as Company[];
  } catch (error) {
    console.error("[getCompaniesForEvent] Error fetching companies for event:", error);
    return [];
  }
}
