"use server";

import { prisma } from "@/lib/prisma";
import type { AcademicYear } from "@/lib/schema";

export async function listAcademicYearsForAdmin(): Promise<AcademicYear[]> {
  return (await prisma.academicYear.findMany({
    orderBy: [{ start_of_year: "desc" }, { id: "desc" }],
  })) as unknown as AcademicYear[];
}

/** The date-bounded year is authoritative; the newest year is a safe setup fallback. */
export async function getCurrentAcademicYear(): Promise<AcademicYear | null> {
  const now = new Date();
  const bounded = await prisma.academicYear.findFirst({
    where: {
      start_of_year: { lte: now },
      end_of_year: { gte: now },
    },
    orderBy: { start_of_year: "desc" },
  });
  if (bounded) return bounded as unknown as AcademicYear;

  return (await prisma.academicYear.findFirst({
    orderBy: [{ start_of_year: "desc" }, { id: "desc" }],
  })) as unknown as AcademicYear | null;
}

export async function resolveAcademicYearId(value?: string | number | null): Promise<number> {
  const explicit = Number(value);
  if (value != null && value !== "" && Number.isSafeInteger(explicit)) {
    const exists = await prisma.academicYear.findUnique({ where: { id: explicit }, select: { id: true } });
    if (!exists) throw new Error("Academic year not found");
    return exists.id;
  }

  const current = await getCurrentAcademicYear();
  if (!current) throw new Error("No academic year is configured");
  return Number(current.id);
}

export async function assertAcademicYearWritable(value: string | number): Promise<number> {
  const id = await resolveAcademicYearId(value);
  const year = await prisma.academicYear.findUnique({ where: { id } });
  if (!year) throw new Error("Academic year not found");

  const endOfYear = year.end_of_year ? new Date(year.end_of_year) : null;
  if (endOfYear && endOfYear.getTime() < Date.now()) {
    throw new Error(`${year.name} is historical and read-only`);
  }
  return id;
}

export async function createAcademicYear(input: {
  name: string;
  startOfYear: string;
  endOfYear: string;
}): Promise<AcademicYear> {
  const name = input.name.trim();
  const start = new Date(`${input.startOfYear}T00:00:00.000Z`);
  const end = new Date(`${input.endOfYear}T23:59:59.999Z`);
  if (!name) throw new Error("Academic year name is required");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Enter valid start and end dates");
  }
  if (start.getTime() > end.getTime()) throw new Error("The end date must be after the start date");

  const conflict = await prisma.academicYear.findFirst({
    where: {
      OR: [
        { name: { equals: name, mode: "insensitive" } },
        { start_of_year: { lte: end }, end_of_year: { gte: start } },
      ],
    },
  });
  if (conflict) throw new Error("An academic year with this name or date range already exists");

  return (await prisma.academicYear.create({
    data: {
      name,
      start_of_year: start,
      end_of_year: end,
      date_created: new Date(),
    },
  })) as unknown as AcademicYear;
}
