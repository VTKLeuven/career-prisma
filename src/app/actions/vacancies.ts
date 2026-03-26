"use server";

import {
  listVacancies,
  getVacancyById,
  createVacancy,
  updateVacancy,
  deleteVacancy,
  listVacancyTypes,
  createVacancyType,
  updateVacancyType,
  deleteVacancyType,
  listVacancySectors,
  createVacancySector,
  updateVacancySector,
  deleteVacancySector,
  listVacancySectionConfigs,
  createVacancySectionConfig,
  updateVacancySectionConfig,
  deleteVacancySectionConfig,
} from "@/lib/repos/vacancies";
import { getUserFromCookies } from "@/lib/auth-server";
import type {
  Vacancy,
  VacancyType,
  VacancySector,
  VacancySectionConfig,
} from "@/lib/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireUser() {
  const user = await getUserFromCookies();
  if (!user) throw new Error("Not authenticated");
  return user;
}

async function requireCompanyUser() {
  const user = await requireUser();
  if (!user.company?.id) throw new Error("No company associated with user");
  return user;
}

async function requireAdmin() {
  const user = await requireUser();
  if (!user.admin) throw new Error("Admin access required");
  return user;
}

// ---------------------------------------------------------------------------
// Public actions (read-only, published vacancies)
// ---------------------------------------------------------------------------

export async function fetchPublicVacanciesAction(opts?: {
  typeId?: string;
  sectorId?: string;
  masterId?: string;
  location?: string;
  sort?: string;
  limit?: number;
  page?: number;
}) {
  return listVacancies({
    ...opts,
    status: "published",
    usePublic: true,
  });
}

export async function fetchPublicVacancyByIdAction(id: string) {
  const vacancy = await getVacancyById(id, true);
  if (!vacancy || vacancy.status !== "published") return null;
  return vacancy;
}

// ---------------------------------------------------------------------------
// Company rep actions
// ---------------------------------------------------------------------------

export async function fetchMyVacanciesAction() {
  const user = await requireCompanyUser();
  return listVacancies({ companyId: user.company!.id, sort: "-date_created" });
}

export async function fetchVacancyByIdAction(id: string) {
  const user = await requireUser();
  const vacancy = await getVacancyById(id);
  if (!vacancy) return null;

  const vacancyCompanyId =
    typeof vacancy.company === "string" ? vacancy.company : vacancy.company?.id;

  if (!user.admin && user.company?.id !== vacancyCompanyId) {
    throw new Error("You do not have access to this vacancy");
  }
  return vacancy;
}

export async function createVacancyAction(
  payload: Partial<Vacancy>
): Promise<Vacancy | null> {
  const user = await requireCompanyUser();
  return createVacancy({
    ...payload,
    company: user.company!.id,
    status: payload.status ?? "draft",
  });
}

export async function updateVacancyAction(
  id: string,
  payload: Partial<Vacancy>
): Promise<Vacancy | null> {
  const user = await requireUser();
  const existing = await getVacancyById(id);
  if (!existing) throw new Error("Vacancy not found");

  const existingCompanyId =
    typeof existing.company === "string"
      ? existing.company
      : existing.company?.id;

  if (!user.admin && user.company?.id !== existingCompanyId) {
    throw new Error("You do not have access to this vacancy");
  }

  return updateVacancy(id, payload);
}

export async function deleteVacancyAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await getVacancyById(id);
  if (!existing) throw new Error("Vacancy not found");

  const existingCompanyId =
    typeof existing.company === "string"
      ? existing.company
      : existing.company?.id;

  if (!user.admin && user.company?.id !== existingCompanyId) {
    throw new Error("You do not have access to this vacancy");
  }

  await deleteVacancy(id);
}

// ---------------------------------------------------------------------------
// Config actions (types, sectors, sections) - read for all, write for admin
// ---------------------------------------------------------------------------

export async function fetchVacancyTypesAction(activeOnly = true) {
  return listVacancyTypes(activeOnly);
}

export async function createVacancyTypeAction(
  payload: Partial<VacancyType>
): Promise<VacancyType | null> {
  await requireAdmin();
  return createVacancyType(payload);
}

export async function updateVacancyTypeAction(
  id: string,
  payload: Partial<VacancyType>
): Promise<VacancyType | null> {
  await requireAdmin();
  return updateVacancyType(id, payload);
}

export async function deleteVacancyTypeAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteVacancyType(id);
}

export async function fetchVacancySectorsAction(activeOnly = true) {
  return listVacancySectors(activeOnly);
}

export async function createVacancySectorAction(
  payload: Partial<VacancySector>
): Promise<VacancySector | null> {
  await requireAdmin();
  return createVacancySector(payload);
}

export async function updateVacancySectorAction(
  id: string,
  payload: Partial<VacancySector>
): Promise<VacancySector | null> {
  await requireAdmin();
  return updateVacancySector(id, payload);
}

export async function deleteVacancySectorAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteVacancySector(id);
}

export async function fetchVacancySectionConfigsAction(activeOnly = true) {
  return listVacancySectionConfigs(activeOnly);
}

export async function createVacancySectionConfigAction(
  payload: Partial<VacancySectionConfig>
): Promise<VacancySectionConfig | null> {
  await requireAdmin();
  return createVacancySectionConfig(payload);
}

export async function updateVacancySectionConfigAction(
  id: string,
  payload: Partial<VacancySectionConfig>
): Promise<VacancySectionConfig | null> {
  await requireAdmin();
  return updateVacancySectionConfig(id, payload);
}

export async function deleteVacancySectionConfigAction(
  id: string
): Promise<void> {
  await requireAdmin();
  await deleteVacancySectionConfig(id);
}

// ---------------------------------------------------------------------------
// Admin: list all vacancies (across companies)
// ---------------------------------------------------------------------------

export async function fetchAllVacanciesAction(opts?: {
  sort?: string;
  limit?: number;
  page?: number;
}) {
  await requireAdmin();
  return listVacancies({ ...opts, sort: opts?.sort ?? "-date_created" });
}
