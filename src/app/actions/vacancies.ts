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
import { isDevEnvironment } from "@/lib/dev-environment";
import { hasGrant } from "@/lib/utils/company-access";
import { sanitizeRichText } from "@/lib/sanitize-html";
import type {
  PublicVacancy,
  Vacancy,
  VacancyType,
  VacancySector,
  VacancySectionConfig,
} from "@/lib/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * The student-facing half of the job platform is dev-only for now; the
 * company and admin half is live (BR-24). Every public route that reaches
 * these actions renders a placeholder on production, so a caller getting this
 * far there is either a stale client or a hand-made request -- refuse both.
 * Without this the public listing would only be unlinked, not off.
 */
function assertPublicVacanciesEnabled() {
  if (!isDevEnvironment()) {
    throw new Error("The vacancy platform is not available on this environment");
  }
}

/**
 * The vacancy pick lists (types, sectors, text sections) serve both halves:
 * the public filters and the company's vacancy form. Anonymous callers keep the
 * public gate; on production they answer only an admin or a company that
 * holds the vacancy grant, the two who can open a form that needs them.
 */
async function assertVacancyLookupAccess() {
  if (isDevEnvironment()) return;
  const user = await getUserFromCookies();
  if (user?.admin || hasGrant(user?.company, "vacancies")) return;
  assertPublicVacanciesEnabled();
}

/**
 * A vacancy as the public site may see it. `contact_email` is internal: the
 * contact form on the vacancy page is delivered to it on the server
 * (lib/vacancy-contact-inquiry.ts), so the address never has to reach the
 * browser. Name and phone are no longer shown publicly either (BR-24).
 */
function toPublicVacancy(vacancy: Vacancy): PublicVacancy {
  const {
    contact_email: _contactEmail,
    contact_name: _contactName,
    contact_phone: _contactPhone,
    sections,
    ...rest
  } = vacancy;
  // The detail page renders sections as HTML. Companies write them, and since
  // BR-24 they do so on production, so strip scripts and handlers on the way
  // out, as toPublicCompany() does for company descriptions.
  const safeSections = Object.fromEntries(
    Object.entries(sections ?? {}).map(([key, html]) => [
      key,
      typeof html === "string" ? sanitizeRichText(html) : html,
    ])
  );
  return { ...rest, sections: safeSections };
}

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

const NO_VACANCY_ACCESS = "The vacancy platform is not part of your company's package this year";

/**
 * A company user whose company holds the vacancy-platform grant this year
 * (lib/grants.ts). Before the grant existed every company user could post;
 * the platform was still behind DEV_ENVIRONMENT then, so no production company
 * ever relied on that. Since BR-24 this is the only gate on the company side.
 */
async function requireVacancyCompanyUser() {
  const user = await requireCompanyUser();
  if (!hasGrant(user.company, "vacancies")) throw new Error(NO_VACANCY_ACCESS);
  return user;
}

/** Admins edit any vacancy; a company user only its own, and only with the grant. */
function assertCanManageVacancy(
  user: Awaited<ReturnType<typeof requireUser>>,
  vacancyCompanyId: string | undefined
) {
  if (user.admin) return;
  if (user.company?.id !== vacancyCompanyId) {
    throw new Error("You do not have access to this vacancy");
  }
  if (!hasGrant(user.company, "vacancies")) throw new Error(NO_VACANCY_ACCESS);
}

/** Whether the signed-in company may use the vacancy platform; admins always may. */
export async function fetchVacancyAccessAction(): Promise<boolean> {
  const user = await requireUser();
  return Boolean(user.admin || hasGrant(user.company, "vacancies"));
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
}): Promise<PublicVacancy[]> {
  assertPublicVacanciesEnabled();
  const vacancies = await listVacancies({
    ...opts,
    status: "published",
    usePublic: true,
  });
  return vacancies.map(toPublicVacancy);
}

export async function fetchPublicVacancyByIdAction(id: string): Promise<PublicVacancy | null> {
  assertPublicVacanciesEnabled();
  const vacancy = await getVacancyById(id, true);
  if (!vacancy || vacancy.status !== "published") return null;
  return toPublicVacancy(vacancy);
}

// ---------------------------------------------------------------------------
// Company rep actions
// ---------------------------------------------------------------------------

export async function fetchMyVacanciesAction() {
  const user = await requireVacancyCompanyUser();
  return listVacancies({ companyId: user.company!.id, sort: "-date_created" });
}

export async function fetchVacancyByIdAction(id: string) {
  const user = await requireUser();
  const vacancy = await getVacancyById(id);
  if (!vacancy) return null;

  const vacancyCompanyId =
    typeof vacancy.company === "string" ? vacancy.company : vacancy.company?.id;

  assertCanManageVacancy(user, vacancyCompanyId);
  return vacancy;
}

const VACANCY_STATUS_VALUES: Vacancy["status"][] = [
  "draft",
  "published",
  "archived",
];

/**
 * The fields the vacancy form writes, and nothing else. The repo turns any key
 * it is given into a column write, so without this a company could send
 * `company_id` (moving a vacancy to another company) or `date_created` along
 * with an update -- harmless while only dev could reach these actions, not
 * once companies post on production (BR-24).
 */
const EDITABLE_VACANCY_FIELDS = [
  "title",
  "type",
  "sectors",
  "location",
  "contact_email",
  "contact_name",
  "contact_phone",
  "sections",
  "masters",
  "status",
] as const satisfies readonly (keyof Vacancy)[];

function editableVacancyFields(payload: Partial<Vacancy>): Partial<Vacancy> {
  const picked: Partial<Vacancy> = {};
  for (const key of EDITABLE_VACANCY_FIELDS) {
    if (payload[key] !== undefined) (picked as Record<string, unknown>)[key] = payload[key];
  }
  if (picked.status !== undefined && !VACANCY_STATUS_VALUES.includes(picked.status)) {
    throw new Error("Invalid vacancy status");
  }
  return picked;
}

export async function createVacancyAction(
  payload: Partial<Vacancy>
): Promise<Vacancy | null> {
  const user = await requireVacancyCompanyUser();
  const fields = editableVacancyFields(payload);
  return createVacancy({
    ...fields,
    company: user.company!.id,
    status: fields.status ?? "draft",
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

  assertCanManageVacancy(user, existingCompanyId);

  return updateVacancy(id, editableVacancyFields(payload));
}

/** Quick status change from the company vacancies table (no full edit form). */
export async function updateVacancyStatusAction(
  id: string,
  status: Vacancy["status"]
): Promise<Vacancy | null> {
  if (!VACANCY_STATUS_VALUES.includes(status)) {
    throw new Error("Invalid vacancy status");
  }
  return updateVacancyAction(id, { status });
}

export async function deleteVacancyAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await getVacancyById(id);
  if (!existing) throw new Error("Vacancy not found");

  const existingCompanyId =
    typeof existing.company === "string"
      ? existing.company
      : existing.company?.id;

  assertCanManageVacancy(user, existingCompanyId);

  await deleteVacancy(id);
}

// ---------------------------------------------------------------------------
// Config actions (types, sectors, sections) - read for all, write for admin
// ---------------------------------------------------------------------------

export async function fetchVacancyTypesAction(activeOnly = true) {
  await assertVacancyLookupAccess();
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
  await assertVacancyLookupAccess();
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
  await assertVacancyLookupAccess();
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

/**
 * Everything /admin/vacancies opens with, in one round trip: types, sectors
 * and section configs (inactive ones included) and the newest vacancies. The
 * page used to make four server actions, which Next runs one at a time.
 */
export async function fetchVacancyAdminDataAction() {
  await requireAdmin();
  const [types, sectors, sectionConfigs, vacancies] = await Promise.all([
    listVacancyTypes(false),
    listVacancySectors(false),
    listVacancySectionConfigs(false),
    listVacancies({ limit: 200, sort: "-date_created" }),
  ]);
  return { types, sectors, sectionConfigs, vacancies };
}

