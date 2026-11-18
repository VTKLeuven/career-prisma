import "server-only";

import { prisma } from "@/lib/prisma";
import { assertAcademicYearWritable, resolveAcademicYearId } from "@/lib/repos/academic-year";
import { invalidateCompanyPageCache } from "@/lib/company-page-cache";
import { invalidateEventPageCache } from "@/lib/event-page-cache";
import { subOptionsGrantVacancies } from "@/lib/repos/vacancy-access";

// A sale decides which options a company page shows and which companies an
// event page lists, so every write drops both public caches.
function invalidatePublicSalePages() {
  invalidateCompanyPageCache();
  invalidateEventPageCache();
}

export type AdminOptionSale = {
  id: string;
  kind: "option" | "sub-option";
  company_id: string;
  company_name: string;
  option_id: string;
  option_name: string;
  academic_year_id: string;
  academic_year_name: string;
  price_at_sale: number | string | null;
  status: string;
  date_created: string;
  event_names: string[];
};

const SALE_INCLUDE = {
  company: { select: { id: true, name: true } },
  academicYear: true,
  careerEventOption: {
    include: {
      careerEventOptionEvents: { include: { careerEvent: true } },
      careerEventOptionSubOptions: { include: { careerSubOption: true } },
    },
  },
} as const;

function shapeSale(row: Record<string, any>): AdminOptionSale {
  return {
    id: String(row.id),
    kind: "option",
    company_id: row.company_id,
    company_name: row.company?.name ?? "(unnamed company)",
    option_id: row.career_event_option_id,
    option_name: row.name_at_sale ?? row.careerEventOption?.name ?? "(deleted option)",
    academic_year_id: String(row.academic_year_id),
    academic_year_name: row.academicYear?.name ?? `Year #${row.academic_year_id}`,
    price_at_sale: row.price_at_sale ?? null,
    status: row.status,
    date_created: row.date_created?.toISOString?.() ?? String(row.date_created ?? ""),
    event_names: (row.careerEventOption?.careerEventOptionEvents ?? [])
      .map((link: Record<string, any>) => link.careerEvent?.name)
      .filter(Boolean),
  };
}

function shapeSubOptionSale(row: Record<string, any>): AdminOptionSale {
  return {
    id: String(row.id),
    kind: "sub-option",
    company_id: row.company_id,
    company_name: row.company?.name ?? "(unnamed company)",
    option_id: String(row.career_sub_option_id),
    option_name: row.name_at_sale ?? row.careerSubOption?.name ?? "(deleted sub-option)",
    academic_year_id: String(row.academic_year_id),
    academic_year_name: row.academicYear?.name ?? `Year #${row.academic_year_id}`,
    price_at_sale: row.price_at_sale ?? null,
    status: row.status,
    date_created: row.date_created?.toISOString?.() ?? String(row.date_created ?? ""),
    event_names: [],
  };
}

/**
 * Set when a sale that carries the `vacancies` grant was just created or
 * reopened (a cancelled row sold again), so the caller can mail the company's
 * representatives (lib/vacancy-access-notification.ts). Re-saving a sale that
 * was already sold is neither, and gives null.
 */
export type VacancyAccessTrigger = { companyId: string; academicYearId: number } | null;

/** A sale row is "activated" by a write when it did not exist or was not sold. */
function isActivated(existing: { status: string } | null | undefined): boolean {
  return !existing || existing.status !== "sold";
}

export async function listOptionSales(academicYearId?: string | number): Promise<AdminOptionSale[]> {
  const yearId = academicYearId == null ? undefined : await resolveAcademicYearId(academicYearId);
  const [optionRows, subOptionRows] = await Promise.all([
    prisma.companyCareerEventOption.findMany({
      where: yearId ? { academic_year_id: yearId } : undefined,
      include: SALE_INCLUDE,
      orderBy: [{ date_created: "desc" }, { id: "desc" }],
    }),
    prisma.companyCareerSubOption.findMany({
      where: yearId ? { academic_year_id: yearId } : undefined,
      include: {
        company: { select: { id: true, name: true } },
        academicYear: true,
        careerSubOption: true,
      },
      orderBy: [{ date_created: "desc" }, { id: "desc" }],
    }),
  ]);
  return [...optionRows.map(shapeSale), ...subOptionRows.map(shapeSubOptionSale)]
    .sort((a, b) => b.date_created.localeCompare(a.date_created));
}

export async function createOptionSale(input: {
  companyId: string;
  optionId: string;
  academicYearId?: string | number;
  subOptionIds?: Array<string | number>;
}): Promise<{ sale: AdminOptionSale; vacancyAccess: VacancyAccessTrigger }> {
  const yearId = await assertAcademicYearWritable(
    await resolveAcademicYearId(input.academicYearId)
  );
  const option = await prisma.careerEventOption.findUnique({
    where: { id: input.optionId },
    include: { careerEventOptionSubOptions: true },
  });
  if (!option) throw new Error("Option not found");
  if (option.academic_year_id != null && option.academic_year_id !== yearId) {
    throw new Error("The option belongs to a different academic year");
  }

  const requestedSubOptions = (input.subOptionIds ?? [])
    .map(Number)
    .filter(Number.isSafeInteger);
  const defaultSubOptions = option.careerEventOptionSubOptions
    .map((link) => link.career_sub_option_id)
    .filter((id): id is number => id != null);
  const subOptionIds = [...new Set([...defaultSubOptions, ...requestedSubOptions])];

  const { saved: sale, activatedSubOptionIds } = await prisma.$transaction(async (tx) => {
    const existingSale = await tx.companyCareerEventOption.findUnique({
      where: {
        company_id_career_event_option_id_academic_year_id: {
          company_id: input.companyId,
          career_event_option_id: input.optionId,
          academic_year_id: yearId,
        },
      },
      select: { status: true },
    });
    // The sub-options this write newly sells: the package's own when the
    // package sale itself is new or reopened (a package grants what its
    // sub-options grant), plus any sub-option row created or reopened below.
    const activated = new Set<number>(isActivated(existingSale) ? defaultSubOptions : []);

    const saved = await tx.companyCareerEventOption.upsert({
      where: {
        company_id_career_event_option_id_academic_year_id: {
          company_id: input.companyId,
          career_event_option_id: input.optionId,
          academic_year_id: yearId,
        },
      },
      create: {
        company_id: input.companyId,
        career_event_option_id: input.optionId,
        academic_year_id: yearId,
        price_at_sale: option.price,
        name_at_sale: option.name,
      },
      update: {
        status: "sold",
        price_at_sale: option.price,
        name_at_sale: option.name,
        date_created: new Date(),
      },
    });

    if (subOptionIds.length) {
      const subOptions = await tx.careerSubOption.findMany({
        where: { id: { in: subOptionIds } },
        select: { id: true, name: true, price: true },
      });
      const existingSubSales = await tx.companyCareerSubOption.findMany({
        where: {
          company_id: input.companyId,
          academic_year_id: yearId,
          career_sub_option_id: { in: subOptions.map((subOption) => subOption.id) },
        },
        select: { career_sub_option_id: true, status: true },
      });
      for (const subOption of subOptions) {
        const existingSubSale = existingSubSales.find((row) => row.career_sub_option_id === subOption.id);
        if (isActivated(existingSubSale)) activated.add(subOption.id);
        await tx.companyCareerSubOption.upsert({
          where: {
            company_id_career_sub_option_id_academic_year_id: {
              company_id: input.companyId,
              career_sub_option_id: subOption.id,
              academic_year_id: yearId,
            },
          },
          create: {
            company_id: input.companyId,
            career_sub_option_id: subOption.id,
            academic_year_id: yearId,
            price_at_sale: subOption.price,
            name_at_sale: subOption.name,
          },
          update: {
            status: "sold",
            price_at_sale: subOption.price,
            name_at_sale: subOption.name,
            date_created: new Date(),
          },
        });
      }
    }
    return { saved, activatedSubOptionIds: [...activated] };
  });

  invalidatePublicSalePages();
  const complete = await prisma.companyCareerEventOption.findUnique({
    where: { id: sale.id },
    include: SALE_INCLUDE,
  });
  const vacancyAccess = (await subOptionsGrantVacancies(activatedSubOptionIds))
    ? { companyId: input.companyId, academicYearId: yearId }
    : null;
  return { sale: shapeSale(complete!), vacancyAccess };
}

export async function deleteOptionSale(id: number): Promise<void> {
  const sale = await prisma.companyCareerEventOption.findUnique({ where: { id } });
  if (!sale) return;
  await assertAcademicYearWritable(sale.academic_year_id);
  await prisma.companyCareerEventOption.update({
    where: { id },
    data: { status: "cancelled" },
  });
  invalidatePublicSalePages();
}

export async function createSubOptionSale(input: {
  companyId: string;
  subOptionId: string | number;
  academicYearId?: string | number;
}): Promise<{ vacancyAccess: VacancyAccessTrigger }> {
  const yearId = await assertAcademicYearWritable(
    await resolveAcademicYearId(input.academicYearId)
  );
  const subOptionId = Number(input.subOptionId);
  if (!Number.isSafeInteger(subOptionId)) throw new Error("Invalid sub-option");
  const subOption = await prisma.careerSubOption.findUnique({ where: { id: subOptionId } });
  if (!subOption) throw new Error("Sub-option not found");

  const existingSale = await prisma.companyCareerSubOption.findUnique({
    where: {
      company_id_career_sub_option_id_academic_year_id: {
        company_id: input.companyId,
        career_sub_option_id: subOptionId,
        academic_year_id: yearId,
      },
    },
    select: { status: true },
  });

  await prisma.companyCareerSubOption.upsert({
    where: {
      company_id_career_sub_option_id_academic_year_id: {
        company_id: input.companyId,
        career_sub_option_id: subOptionId,
        academic_year_id: yearId,
      },
    },
    create: {
      company_id: input.companyId,
      career_sub_option_id: subOptionId,
      academic_year_id: yearId,
      price_at_sale: subOption.price,
      name_at_sale: subOption.name,
    },
    update: {
      status: "sold",
      price_at_sale: subOption.price,
      name_at_sale: subOption.name,
      date_created: new Date(),
    },
  });
  invalidatePublicSalePages();
  const vacancyAccess =
    isActivated(existingSale) && (await subOptionsGrantVacancies([subOptionId]))
      ? { companyId: input.companyId, academicYearId: yearId }
      : null;
  return { vacancyAccess };
}

export async function deleteSubOptionSale(id: number): Promise<void> {
  const sale = await prisma.companyCareerSubOption.findUnique({ where: { id } });
  if (!sale) return;
  await assertAcademicYearWritable(sale.academic_year_id);
  await prisma.companyCareerSubOption.update({
    where: { id },
    data: { status: "cancelled" },
  });
  invalidatePublicSalePages();
}

/** Cancels a company's current-year sale of a sub-option (by sub-option, not sale id). */
export async function cancelCompanySubOption(companyId: string, subOptionId: string): Promise<boolean> {
  const subOption = Number(subOptionId);
  if (!Number.isSafeInteger(subOption)) return false;
  const academicYearId = await assertAcademicYearWritable(await resolveAcademicYearId());
  await prisma.companyCareerSubOption.updateMany({
    where: { company_id: companyId, career_sub_option_id: subOption, academic_year_id: academicYearId },
    data: { status: "cancelled" },
  });
  invalidatePublicSalePages();
  return true;
}

/** Cancels a company's current-year sale of an option (by option, not sale id). */
export async function cancelCompanyOption(companyId: string, optionId: string): Promise<void> {
  const academicYearId = await assertAcademicYearWritable(await resolveAcademicYearId());
  await prisma.companyCareerEventOption.updateMany({
    where: {
      company_id: companyId,
      career_event_option_id: optionId,
      academic_year_id: academicYearId,
    },
    data: { status: "cancelled" },
  });
  invalidatePublicSalePages();
}
