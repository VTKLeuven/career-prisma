"use server";

import {
  listMatchingSoftware,
  getActiveMatchingSoftwareForEvent,
  getFirstActiveMatchingSoftware,
  createMatchingSoftware,
  updateMatchingSoftware,
  getStudentMatchingResponse,
  createStudentMatchingResponse,
  getCompanyMatchingResponse,
  getCompanyMatchingResponseCompletedIds,
  getCompanyMatchCounts,
  getCompanyGeneralInfoForCompanies,
  createOrUpdateCompanyMatchingResponse,
  syncCompanyMatchedStudents,
  syncAllCompanyMatchedStudents,
  fullUpdateAllMatches,
  getStudentFormResponseForForm,
  computeAndStoreCompanyMatches,
  getCompaniesByIds,
  getMatchedCompaniesForResponse,
  getMatchScoresForResponse,
  shouldRecomputeMatches,
} from "@/lib/repos/matching-software";
import type { MatchingSoftware, RIASECType } from "@/lib/schema";

export async function listMatchingSoftwareAction(opts?: {
  eventId?: string;
  yearId?: string;
  active?: boolean;
}) {
  return listMatchingSoftware(opts);
}

export async function createMatchingSoftwareAction(data: {
  year: string;
  event: string;
  prerequisite_form?: string;
  active?: boolean;
}) {
  return createMatchingSoftware(data);
}

export async function updateMatchingSoftwareAction(id: string, data: { active?: boolean; companies_can_view_matches?: boolean }) {
  return updateMatchingSoftware(id, data);
}

export async function getMatchingSoftwareForEventAction(eventId: string) {
  return getActiveMatchingSoftwareForEvent(eventId);
}

export async function getFirstActiveMatchingSoftwareAction() {
  return getFirstActiveMatchingSoftware();
}

export async function getCompanyMatchingResponseAction(companyId: string, matchingSoftwareId: string) {
  return getCompanyMatchingResponse(companyId, matchingSoftwareId);
}

/** Get company matching response for company view. Strips students if company lacks "Matching Software" suboption. */
export async function getCompanyMatchingResponseForCompanyViewAction(companyId: string, matchingSoftwareId: string) {
  const { fetchCompanyByIdAction } = await import("@/app/actions/companies");
  const { hasMatchingSoftwareSubOption } = await import("@/lib/utils/company-access");
  const response = await getCompanyMatchingResponse(companyId, matchingSoftwareId);
  if (!response) return null;
  const company = await fetchCompanyByIdAction(companyId, false, true);
  const hasSubOption = hasMatchingSoftwareSubOption(company);
  const studentCount = Array.isArray((response as { students?: unknown }).students) ? (response as { students: unknown[] }).students.length : 0;
  if (!hasSubOption) {
    console.log("[Matching] getCompanyMatchingResponseForCompanyViewAction: stripping students (no suboption) | companyId:", companyId, "| had:", studentCount);
    return { ...response, students: [] };
  }
  console.log("[Matching] getCompanyMatchingResponseForCompanyViewAction: returning", studentCount, "students for companyId:", companyId);
  return response;
}

export async function getCompanyMatchingResponseCompletedIdsAction(
  matchingSoftwareId: string,
  companyIds: string[]
) {
  return getCompanyMatchingResponseCompletedIds(matchingSoftwareId, companyIds);
}

export async function syncCompanyMatchedStudentsAction(
  companyId: string,
  matchingSoftwareId: string
) {
  return syncCompanyMatchedStudents(companyId, matchingSoftwareId);
}

/** Sync matched students for all companies with a matching response. Admin only. */
export async function syncAllCompanyMatchedStudentsAction(matchingSoftwareId: string) {
  return syncAllCompanyMatchedStudents(matchingSoftwareId);
}

/** Full update: recompute all student matches, then sync company matches. Returns logs for admin display. */
export async function fullUpdateAllMatchesAction(matchingSoftwareId: string) {
  try {
    return await fullUpdateAllMatches(matchingSoftwareId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      studentsUpdated: 0,
      companiesSynced: 0,
      errors: [`Update failed: ${msg}`],
      logs: [`[Error] ${msg}`],
    };
  }
}

/** Get match counts per company for admin overview. */
export async function getCompanyMatchCountsAction(matchingSoftwareId: string) {
  return getCompanyMatchCounts(matchingSoftwareId);
}

export async function saveCompanyMatchingResponseAction(
  companyId: string,
  matchingSoftwareId: string,
  ociaAnswers: Record<string, string>,
  ocia: Record<string, number>,
  generalInfo?: { work_preference?: string[]; company_type?: string[]; work_options?: string[] }
) {
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

export async function getStudentMatchingResponseAction(
  studentId: string,
  matchingSoftwareId: string
) {
  return getStudentMatchingResponse(studentId, matchingSoftwareId);
}

/** Get the current logged-in student's matching response. Uses getStudentFromCookies so we always use the server's student ID. */
export async function getStudentMatchingResponseForCurrentUserAction(matchingSoftwareId: string) {
  const { getStudentFromCookies } = await import("@/lib/auth-student");
  const student = await getStudentFromCookies();
  console.log("[getStudentMatchingResponseForCurrentUserAction] student from cookies:", student ? { id: student.id, idType: typeof student.id } : null, "matchingSoftwareId:", matchingSoftwareId);
  if (!student?.id) {
    console.log("[getStudentMatchingResponseForCurrentUserAction] No student - returning null");
    return null;
  }
  const result = await getStudentMatchingResponse(student.id, matchingSoftwareId);
  console.log("[getStudentMatchingResponseForCurrentUserAction] result:", result ? "found" : "null");
  return result;
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
  return getCompaniesByIds(companyIds);
}

/** Fetch matched companies for a response by reading the junction table directly. */
export async function fetchMatchedCompaniesForResponseAction(responseId: string) {
  return getMatchedCompaniesForResponse(responseId);
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

/** Fetch company general info for matched companies. Returns map of companyId -> GeneralInfoAnswers. */
export async function fetchCompanyGeneralInfoAction(
  matchingSoftwareId: string,
  companyIds: string[]
) {
  return getCompanyGeneralInfoForCompanies(matchingSoftwareId, companyIds);
}

/** Fetch match scores for display (lower = better match). */
export async function fetchMatchScoresAction(
  riasec: Record<import("@/lib/schema").RIASECType, number>,
  studentGeneralInfo: import("@/lib/matching-general-info").GeneralInfoAnswers | null | undefined,
  matchingSoftwareId: string,
  companyIds: string[]
) {
  return getMatchScoresForResponse(riasec, studentGeneralInfo, matchingSoftwareId, companyIds);
}

/** Re-run company matching for the current user's response. Only recomputes if last run was >24h ago.
 * Syncs affected companies (old + new matches) so their top 50 stays up to date. */
export async function recomputeCompanyMatchesForCurrentUserAction(matchingSoftwareId: string) {
  const { getStudentFromCookies } = await import("@/lib/auth-student");
  const { getMatchedCompanyIdsForResponse } = await import("@/lib/repos/matching-software");
  const student = await getStudentFromCookies();
  if (!student?.id) return null;
  const resp = await getStudentMatchingResponse(student.id, matchingSoftwareId);
  if (!resp?.id || !resp.riasec) return null;
  const needsRecompute = await shouldRecomputeMatches(resp.id);
  if (!needsRecompute) return resp;
  const previousCompanyIds = await getMatchedCompanyIdsForResponse(resp.id);
  const generalInfo = (resp as { general_info_answers?: import("@/lib/matching-general-info").GeneralInfoAnswers }).general_info_answers;
  const newCompanyIds = await computeAndStoreCompanyMatches(
    resp.id,
    matchingSoftwareId,
    resp.riasec as Record<import("@/lib/schema").RIASECType, number>,
    resp.prerequisite_form_response ?? undefined,
    generalInfo ?? undefined
  );
  const affectedCompanyIds = [...new Set([...previousCompanyIds, ...newCompanyIds])];
  for (const companyId of affectedCompanyIds) {
    try {
      await syncCompanyMatchedStudents(companyId, matchingSoftwareId);
    } catch (syncErr) {
      console.error("[recomputeCompanyMatchesForCurrentUserAction] Sync company", companyId, "failed (non-fatal):", syncErr);
    }
  }
  return getStudentMatchingResponse(student.id, matchingSoftwareId);
}

/** Returns student's form response if they have filled the prerequisite form. Any version of the form counts as complete. */
export async function checkStudentPrerequisiteAction(
  studentId: string,
  formId: string
) {
  const response = await getStudentFormResponseForForm(studentId, formId);
  return response ?? null;
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
