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
  getCompanyGeneralInfoForCompanies,
  createOrUpdateCompanyMatchingResponse,
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

export async function updateMatchingSoftwareAction(id: string, data: { active?: boolean }) {
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

export async function getCompanyMatchingResponseCompletedIdsAction(
  matchingSoftwareId: string,
  companyIds: string[]
) {
  return getCompanyMatchingResponseCompletedIds(matchingSoftwareId, companyIds);
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

/** Re-run company matching for the current user's response. Only recomputes if last run was >24h ago. */
export async function recomputeCompanyMatchesForCurrentUserAction(matchingSoftwareId: string) {
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

/** Returns student's form response only if it's for the latest (active) version. If they filled an older version, returns null so they must update. */
export async function checkStudentPrerequisiteAction(
  studentId: string,
  formId: string
) {
  const { getActiveFormVersionForServer } = await import("@/lib/repos/forms");
  const [response, activeVersion] = await Promise.all([
    getStudentFormResponseForForm(studentId, formId),
    getActiveFormVersionForServer(formId),
  ]);
  if (!response || !activeVersion) return null;
  // Prerequisite met only if their response is for the active version
  if (response.form_version_id !== activeVersion.id) return null;
  return response;
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
