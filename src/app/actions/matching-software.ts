"use server";

import {
  listMatchingSoftware,
  getActiveMatchingSoftwareForEvent,
  getMatchingSoftwareById,
  createMatchingSoftware,
  updateMatchingSoftware,
  getStudentMatchingResponse,
  createStudentMatchingResponse,
  getCompanyMatchingResponse,
  getCompanyMatchingResponseCompletedIds,
  getCompanyMatchCounts,
  getCompanyGeneralInfoForCompanies,
  createOrUpdateCompanyMatchingResponse,
  getStudentFormResponseForForm,
  computeAndStoreCompanyMatches,
  getCompaniesByIds,
  getMatchedCompaniesForResponse,
  getMatchScoresForResponse,
  shouldRecomputeMatches,
} from "@/lib/repos/matching-software";
import type { RIASECType } from "@/lib/schema";
import { getUserFromCookies, requireAdminUser } from "@/lib/auth-server";
import { getStudentFromCookies } from "@/lib/auth-student";
import { toPublicCompany } from "@/lib/repos/_shape";

export async function listMatchingSoftwareAction(opts?: {
  eventId?: string;
  yearId?: string;
  active?: boolean;
}) {
  await requireAdminUser();
  return listMatchingSoftware(opts);
}

export async function createMatchingSoftwareAction(data: {
  year: string;
  event: string;
  prerequisite_form?: string;
  active?: boolean;
}) {
  await requireAdminUser();
  return createMatchingSoftware(data);
}

export async function updateMatchingSoftwareAction(id: string, data: { active?: boolean; companies_can_view_matches?: boolean }) {
  await requireAdminUser();
  return updateMatchingSoftware(id, data);
}

export async function getMatchingSoftwareForEventAction(eventId: string) {
  return getActiveMatchingSoftwareForEvent(eventId);
}

export async function getCompanyMatchingResponseAction(companyId: string, matchingSoftwareId: string) {
  const user = await getUserFromCookies();
  if (!user?.admin && user?.company?.id !== companyId) {
    throw new Error("Unauthorized");
  }
  return getCompanyMatchingResponse(companyId, matchingSoftwareId);
}

/** Get company matching response for company view. Strips students if:
 * - Matching_Software.companies_can_view_matches is false (not yet open to companies), or
 * - Company lacks "Matching Software" suboption. */
export async function getCompanyMatchingResponseForCompanyViewAction(companyId: string, matchingSoftwareId: string) {
  const user = await getUserFromCookies();
  if (!user?.admin && user?.company?.id !== companyId) {
    throw new Error("Unauthorized");
  }
  const { fetchCompanyByIdAction } = await import("@/app/actions/companies");
  const { hasMatchingSoftwareSubOption } = await import("@/lib/utils/company-access");
  const response = await getCompanyMatchingResponse(companyId, matchingSoftwareId);
  if (!response) return null;

  const ms = await getMatchingSoftwareById(matchingSoftwareId);
  const companiesCanViewMatches = ms?.companies_can_view_matches ?? false;
  if (!companiesCanViewMatches) {
    return { ...response, students: [] };
  }

  const company = await fetchCompanyByIdAction(companyId, false, true);
  const hasSubOption = hasMatchingSoftwareSubOption(company);
  if (!hasSubOption) {
    return { ...response, students: [] };
  }
  return response;
}

export async function getCompanyMatchingResponseCompletedIdsAction(
  matchingSoftwareId: string,
  companyIds: string[]
) {
  await requireAdminUser();
  return getCompanyMatchingResponseCompletedIds(matchingSoftwareId, companyIds);
}

/** Get match counts per company for admin overview. */
export async function getCompanyMatchCountsAction(matchingSoftwareId: string) {
  await requireAdminUser();
  return getCompanyMatchCounts(matchingSoftwareId);
}

export async function saveCompanyMatchingResponseAction(
  companyId: string,
  matchingSoftwareId: string,
  ociaAnswers: Record<string, string>,
  ocia: Record<string, number>,
  generalInfo?: { work_preference?: string[]; company_type?: string[]; work_options?: string[] }
) {
  const user = await getUserFromCookies();
  if (!user?.company || user.company.id !== companyId) {
    throw new Error("Unauthorized");
  }
  return createOrUpdateCompanyMatchingResponse({
    company: companyId,
    matching_software: matchingSoftwareId,
    ocia_answers: ociaAnswers,
    ocia: ocia as Record<"Clan" | "Adhocracy" | "Market" | "Hierarchy", number>,
    general_info_answers: {
      work_preference: generalInfo?.work_preference ?? [],
      company_type: generalInfo?.company_type ?? [],
      work_options: generalInfo?.work_options ?? [],
    },
  });
}

/** Get the current logged-in student's matching response. Uses getStudentFromCookies so we always use the server's student ID. */
export async function getStudentMatchingResponseForCurrentUserAction(matchingSoftwareId: string) {
  const { getStudentFromCookies } = await import("@/lib/auth-student");
  const student = await getStudentFromCookies();
  if (!student?.id) return null;
  return getStudentMatchingResponse(student.id, matchingSoftwareId);
}

export async function submitStudentMatchingAction(
  matchingSoftwareId: string,
  answers: Record<string, string>,
  prerequisiteFormResponse?: Record<string, unknown>,
  generalInfoAnswers?: { work_preference: string[]; company_preference?: string[]; options_preference?: string[] }
) {
  const { getStudentFromCookies } = await import("@/lib/auth-student");
  const student = await getStudentFromCookies();
  if (!student?.id) throw new Error("Not logged in as student");
  const riasec = calculateRIASECPercentages(answers);
  return createStudentMatchingResponse({
    student: String(student.id),
    matching_software: matchingSoftwareId,
    riasec_answers: answers,
    riasec,
    prerequisite_form_response: prerequisiteFormResponse,
    general_info_answers: generalInfoAnswers ?? { work_preference: [], company_preference: [], options_preference: [] },
  });
}

/** Fetch company names for given IDs. */
export async function fetchMatchedCompaniesAction(companyIds: string[]) {
  await requireAdminUser();
  return getCompaniesByIds(companyIds);
}

/** Fetch matched company IDs for the current student on an event. Returns { matchedIds, hasMatchingSoftware }. */
export async function fetchMatchedCompanyIdsForEventAction(eventId: string): Promise<{
  matchedIds: string[];
  hasMatchingSoftware: boolean;
}> {
  const ms = await getMatchingSoftwareForEventAction(eventId);
  if (!ms?.id) return { matchedIds: [], hasMatchingSoftware: false };
  const resp = await getStudentMatchingResponseForCurrentUserAction(ms.id);
  if (!resp?.id) return { matchedIds: [], hasMatchingSoftware: true };
  const companies = await getMatchedCompaniesForResponse(resp.id);
  const matchedIds = companies.map((c) => c.id).filter(Boolean);
  return { matchedIds, hasMatchingSoftware: true };
}

/** Re-run company matching for the current user's response. Only recomputes if last run was >24h ago.
 * Company matches are synced daily at 0:00 or via admin manual "Update matches" button. */
async function recomputeCompanyMatchesForCurrentUserAction(matchingSoftwareId: string) {
  const { getStudentFromCookies } = await import("@/lib/auth-student");
  const student = await getStudentFromCookies();
  if (!student?.id) return null;
  const resp = await getStudentMatchingResponse(student.id, matchingSoftwareId);
  if (!resp?.id || !resp.riasec) return null;
  const needsRecompute = await shouldRecomputeMatches(resp.id);
  if (!needsRecompute) return resp;
  const generalInfo = (resp as { general_info_answers?: import("@/lib/matching-general-info").GeneralInfoAnswers }).general_info_answers;
  await computeAndStoreCompanyMatches(
    resp.id,
    matchingSoftwareId,
    resp.riasec as Record<import("@/lib/schema").RIASECType, number>,
    resp.prerequisite_form_response ?? undefined,
    generalInfo ?? undefined
  );
  return getStudentMatchingResponse(student.id, matchingSoftwareId);
}

type StudentResponse = NonNullable<Awaited<ReturnType<typeof getStudentMatchingResponse>>>;

const EMPTY_GENERAL_INFO = { work_preference: [], company_preference: [], options_preference: [] };

/** A response's matched companies (public view) with their general-info answers and match scores. */
async function loadStudentMatchResults(matchingSoftwareId: string, resp: StudentResponse) {
  const companies = (await getMatchedCompaniesForResponse(String(resp.id))).map(toPublicCompany);
  if (companies.length === 0) {
    return { companies, companyGeneralInfo: {} as Awaited<ReturnType<typeof getCompanyGeneralInfoForCompanies>>, scores: {} as Record<string, number> };
  }
  const ids = companies.map((c) => c.id);
  const studentGi = (resp as { general_info_answers?: import("@/lib/matching-general-info").GeneralInfoAnswers }).general_info_answers ?? EMPTY_GENERAL_INFO;
  const [companyGeneralInfo, scores] = await Promise.all([
    getCompanyGeneralInfoForCompanies(matchingSoftwareId, ids),
    getMatchScoresForResponse(resp.riasec as Record<RIASECType, number>, studentGi, matchingSoftwareId, ids),
  ]);
  return { companies, companyGeneralInfo, scores };
}

/**
 * Everything the student matching page opens with, in one round trip: the
 * event's matching software, the student's response (matches recomputed when
 * due), the prerequisite form check, and the results. The page used to chain
 * up to seven server actions, each waiting for the last.
 */
export async function fetchStudentMatchingStateAction(eventId: string) {
  const student = await getStudentFromCookies();
  if (!student?.id) return null;
  const matchingSoftware = await getActiveMatchingSoftwareForEvent(eventId);
  if (!matchingSoftware) {
    return { matchingSoftware: null, response: null, prerequisite: null, prerequisiteMissing: false, results: null };
  }

  let response = await getStudentMatchingResponse(student.id, matchingSoftware.id);
  if (response) {
    try {
      response = (await recomputeCompanyMatchesForCurrentUserAction(matchingSoftware.id)) ?? response;
    } catch {
      // Non-fatal: continue with existing response
    }
  }

  let prerequisite: Record<string, unknown> | null = null;
  if (matchingSoftware.prerequisite_form) {
    const pf = matchingSoftware.prerequisite_form as string | { id: string };
    const formId = typeof pf === "string" ? pf : pf.id;
    const prereq = await getStudentFormResponseForForm(String(student.id), formId);
    if (!prereq) {
      return { matchingSoftware, response, prerequisite: null, prerequisiteMissing: true, results: null };
    }
    prerequisite = (prereq as { data?: Record<string, unknown> }).data ?? null;
  }

  const results = response ? await loadStudentMatchResults(matchingSoftware.id, response) : null;
  return { matchingSoftware, response, prerequisite, prerequisiteMissing: false, results };
}

/** The signed-in student's response and results, e.g. right after submitting. */
export async function fetchStudentMatchResultsAction(matchingSoftwareId: string) {
  const student = await getStudentFromCookies();
  if (!student?.id) return null;
  const response = await getStudentMatchingResponse(student.id, matchingSoftwareId);
  if (!response) return null;
  return { response, results: await loadStudentMatchResults(matchingSoftwareId, response) };
}

// RIASEC calculation - 12 questions, each maps A or B to a type
const RIASEC_QUESTIONS: { id: number; A: RIASECType; B: RIASECType }[] = [
  { id: 1, A: "R", B: "I" },
  { id: 2, A: "A", B: "E" },
  { id: 3, A: "I", B: "S" },
  { id: 4, A: "R", B: "C" },
  { id: 5, A: "E", B: "C" },
  { id: 6, A: "A", B: "C" },
  { id: 7, A: "S", B: "E" },
  { id: 8, A: "C", B: "A" },
  { id: 9, A: "R", B: "I" },
  { id: 10, A: "S", B: "I" },
  { id: 11, A: "C", B: "A" },
  { id: 12, A: "S", B: "I" },
];

function calculateRIASECPercentages(answers: Record<string, string>): Record<RIASECType, number> {
  const counts: Record<RIASECType, number> = {
    R: 0, I: 0, A: 0, S: 0, E: 0, C: 0,
  };

  RIASEC_QUESTIONS.forEach((q) => {
    const ans = answers[q.id.toString()];
    if (ans === "A") counts[q.A]++;
    else if (ans === "B") counts[q.B]++;
  });

  const total = RIASEC_QUESTIONS.length;
  return {
    R: Math.round((counts.R / total) * 100 * 100) / 100,
    I: Math.round((counts.I / total) * 100 * 100) / 100,
    A: Math.round((counts.A / total) * 100 * 100) / 100,
    S: Math.round((counts.S / total) * 100 * 100) / 100,
    E: Math.round((counts.E / total) * 100 * 100) / 100,
    C: Math.round((counts.C / total) * 100 * 100) / 100,
  };
}
