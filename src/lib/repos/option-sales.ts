"use server";

import { prisma } from "@/lib/prisma";
import { assertAcademicYearWritable, resolveAcademicYearId } from "@/lib/repos/academic-year";

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
}): Promise<AdminOptionSale> {
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

  const sale = await prisma.$transaction(async (tx) => {
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
      for (const subOption of subOptions) {
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
    return saved;
  });

  const complete = await prisma.companyCareerEventOption.findUnique({
    where: { id: sale.id },
    include: SALE_INCLUDE,
  });
  return shapeSale(complete!);
}

export async function deleteOptionSale(id: number): Promise<void> {
  const sale = await prisma.companyCareerEventOption.findUnique({ where: { id } });
  if (!sale) return;
  await assertAcademicYearWritable(sale.academic_year_id);
  await prisma.companyCareerEventOption.update({
    where: { id },
    data: { status: "cancelled" },
  });
}

export async function createSubOptionSale(input: {
  companyId: string;
  subOptionId: string | number;
  academicYearId?: string | number;
}): Promise<void> {
  const yearId = await assertAcademicYearWritable(
    await resolveAcademicYearId(input.academicYearId)
  );
  const subOptionId = Number(input.subOptionId);
  if (!Number.isSafeInteger(subOptionId)) throw new Error("Invalid sub-option");
  const subOption = await prisma.careerSubOption.findUnique({ where: { id: subOptionId } });
  if (!subOption) throw new Error("Sub-option not found");

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
}

export async function deleteSubOptionSale(id: number): Promise<void> {
  const sale = await prisma.companyCareerSubOption.findUnique({ where: { id } });
  if (!sale) return;
  await assertAcademicYearWritable(sale.academic_year_id);
  await prisma.companyCareerSubOption.update({
    where: { id },
    data: { status: "cancelled" },
  });
}
