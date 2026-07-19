// lib/repos/matching-software.ts
"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { COMPANY_INCLUDE, shapeCompany } from "@/lib/repos/_shape";
import type { MatchingSoftware, StudentMatchingResponse, CompanyMatchingResponse, RIASECType, OCIAType } from "@/lib/schema";
import { countGeneralInfoOverlap, type GeneralInfoAnswers } from "@/lib/matching-general-info";

const RIASEC_TYPES: RIASECType[] = ["R", "I", "A", "S", "E", "C"];

/** RIASEC → OCIA mapping: Clan=S+A, Adhocracy=A+E, Market=R+E, Hierarchy=C+I. 6/4 scales 6 RIASEC dims to 4 OCIA dims. */
function riasecToOcia(riasec: Record<RIASECType, number>): Record<OCIAType, number> {
  return {
    Clan: ((riasec.S ?? 0) + (riasec.A ?? 0)) / 2 * 6 / 4,
    Adhocracy: ((riasec.A ?? 0) + (riasec.E ?? 0)) / 2 * 6 / 4,
    Market: ((riasec.R ?? 0) + (riasec.E ?? 0)) / 2 * 6 / 4,
    Hierarchy: ((riasec.C ?? 0) + (riasec.I ?? 0)) / 2 * 6 / 4,
  };
}

/** Convert riasec_answers (e.g. { "1": "A", "2": "B" }) to RIASEC percentages. */
function computeRiasecFromAnswers(answers: Record<string, string>): Record<RIASECType, number> {
  const RIASEC_QUESTIONS: { id: number; A: RIASECType; B: RIASECType }[] = [
    { id: 1, A: "R", B: "I" }, { id: 2, A: "A", B: "E" }, { id: 3, A: "I", B: "S" },
    { id: 4, A: "R", B: "C" }, { id: 5, A: "E", B: "C" }, { id: 6, A: "A", B: "C" },
    { id: 7, A: "S", B: "E" }, { id: 8, A: "C", B: "A" }, { id: 9, A: "R", B: "I" },
    { id: 10, A: "S", B: "I" }, { id: 11, A: "C", B: "A" }, { id: 12, A: "S", B: "I" },
  ];
  const counts: Record<RIASECType, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  for (const q of RIASEC_QUESTIONS) {
    const ans = answers[q.id.toString()];
    if (ans === "A") counts[q.A]++;
    else if (ans === "B") counts[q.B]++;
  }
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

/** Sum of absolute differences between OCIA profiles (lower = more similar). Both inputs are 0–100; returns 0–1. */
function ociaSimilarityScore(studentOcia: Record<OCIAType, number>, companyOcia: Record<OCIAType, number>): number {
  const types: OCIAType[] = ["Clan", "Adhocracy", "Market", "Hierarchy"];
  const raw = types.reduce((sum, t) => sum + Math.abs((studentOcia[t] ?? 0) - (companyOcia[t] ?? 0)), 0) / types.length;
  return raw / 100; // normalize to 0–1 so comparable with generalInfoOverlap
}

const STUDY_FIELD_KEYS = [
  "study_field",     // Primary: e.g. "Civil Engineering"
  "course_of_study", // e.g. "Artificial Intelligence"
  "faculty",         // e.g. "Faculty of Engineering Science"
  "specialisation_optional", // e.g. "Structural"
  "study",
  "master",
  "program",
  "masters",
  "master_degree",
  "master_degrees",
];

/** Unwrap form data - handles { data: {...} }, JSON string, or direct {...}. */
function unwrapFormData(data: unknown): Record<string, unknown> | null | undefined {
  if (data == null) return null;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as Record<string, unknown>;
      return typeof parsed === "object" && parsed ? unwrapFormData(parsed) : null;
    } catch {
      return null;
    }
  }
  if (typeof data !== "object" || Array.isArray(data)) return data as Record<string, unknown>;
  const obj = data as Record<string, unknown>;
  if ("data" in obj && obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    return obj.data as Record<string, unknown>;
  }
  return obj;
}

/** Extract raw study field value(s) from form data. Handles strings, objects with name, and arrays (master-degrees multiselect).
 * Collects from all STUDY_FIELD_KEYS so both course_of_study and faculty (etc.) are used for matching across form versions. */
function extractStudyFieldRawValues(data: Record<string, unknown> | null | undefined): string[] {
  const unwrapped = unwrapFormData(data);
  if (!unwrapped || typeof unwrapped !== "object") {
    if (!data) console.log("[Matching] extractStudyFieldRawValues: no data or not object");
    return [];
  }
  data = unwrapped;
  const extractOne = (val: unknown): string | null => {
    if (val == null) return null;
    if (typeof val === "string" && val.trim()) return val.trim();
    if (typeof val === "object" && val !== null && "name" in (val as object)) {
      const name = String((val as { name: string }).name).trim();
      if (name) return name;
    }
    if (typeof val === "object" && val !== null && ("id" in (val as object) || "value" in (val as object) || "label" in (val as object))) {
      const o = val as Record<string, unknown>;
      const v = o.name ?? o.label ?? o.value ?? o.id;
      if (v != null && String(v).trim()) return String(v).trim();
    }
    return null;
  };

  const collected: string[] = [];
  for (const key of STUDY_FIELD_KEYS) {
    const val = data[key];
    if (val == null) continue;
    if (Array.isArray(val)) {
      const items = val.map(extractOne).filter((s): s is string => !!s);
      for (const s of items) if (!collected.includes(s)) collected.push(s);
    } else {
      const s = extractOne(val);
      if (s && !collected.includes(s)) collected.push(s);
    }
  }
  if (collected.length > 0) {
    console.log("[Matching] extractStudyFieldRawValues: found", collected);
    return collected;
  }
  console.log("[Matching] extractStudyFieldRawValues: no study field in keys", STUDY_FIELD_KEYS, "| data keys:", Object.keys(data));
  return [];
}

/** Resolve raw form values (e.g. fac:facId:masterId or master UUID) to display labels for matching. */
async function resolveStudyFieldForMatching(
  data: Record<string, unknown> | null | undefined
): Promise<string[]> {
  const raw = extractStudyFieldRawValues(data);
  if (raw.length === 0) return [];

  const isMasterDegreesValue = (s: string) =>
    /^fac:[^:]+(:[^:]+)?$/.test(s) || /^[0-9a-f-]{36}$/i.test(s) || /^\d+$/.test(s);

  const needsResolution = raw.some(isMasterDegreesValue);
  if (!needsResolution) return raw;

  try {
    const { listMasters, listFaculties } = await import("./features");
    const { normalizeFaculties } = await import("@/lib/utils/master-degree-options");
    const { resolveMasterDegreeValueToDisplayLabel } = await import("@/lib/utils/master-degree-options");

    const masters = (await listMasters({ limit: 300, sort: "name" })) ?? [];
    const rawFaculties = (await listFaculties({ limit: 100, sort: "name" })) ?? [];
    const faculties = normalizeFaculties(rawFaculties);

    const resolved = raw.map((r) => {
      if (isMasterDegreesValue(r)) {
        const label = resolveMasterDegreeValueToDisplayLabel(r, masters, faculties);
        return label || r;
      }
      return r;
    });
    console.log("[Matching] resolveStudyFieldForMatching: resolved", raw, "->", resolved);
    return resolved.filter(Boolean);
  } catch (err) {
    console.error("[Matching] resolveStudyFieldForMatching error:", err);
    return raw;
  }
}

/** Extract company's interested study categories (from company profile or form). */
function getCompanyCategoryNames(company: { category?: unknown }): string[] {
  const raw = company.category;
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const o = item as Record<string, unknown>;
      // master_id relation (junction table)
      const mid = o.master_id;
      if (mid != null) {
        if (typeof mid === "object" && mid && "name" in (mid as object)) return String((mid as { name: string }).name).trim();
      }
      // category_id (alternate junction field)
      const cid = o.category_id;
      if (cid != null && typeof cid === "object" && cid && "name" in (cid as object)) return String((cid as { name: string }).name).trim();
      // Direct master/category object
      if ("name" in o) return String(o.name).trim();
      return null;
    })
    .filter((n): n is string => Boolean(n));
}

/** Check if any of the student's study fields match the company's interested categories.
 * - Students with a specific field (e.g. Mechanical Engineering) only match companies that explicitly list it.
 * - Students with "Other" or from a faculty without masters match companies that have "Other" in their categories.
 * - When allowAllWhenCompanyHasNoCategories and company has no categories, returns true (for fill-up).
 * - When allowWordMatchForFillUp, also matches if student field contains the first word of any category (e.g. "Chemical" matches "Chemical and Process Engineering"). */
function studyFieldMatches(
  studentStudyFields: string[],
  companyCategoryNames: string[],
  companyHasOther: boolean,
  companyId?: string,
  allowAllWhenCompanyHasNoCategories = false,
  allowWordMatchForFillUp = false
): boolean {
  if (allowAllWhenCompanyHasNoCategories && companyCategoryNames.length === 0) {
    return true;
  }
  if (studentStudyFields.length === 0) {
    if (companyId) console.log("[Matching] studyFieldMatches: company", companyId, "NO MATCH (no student study field)");
    return false;
  }
  const studentHasOther = studentStudyFields.some((s) => /^others?$/i.test(s.trim()));
  if (studentHasOther && companyHasOther) {
    if (companyId) console.log("[Matching] studyFieldMatches: company", companyId, "MATCH (student has Other, company has Other)");
    return true;
  }
  const explicitCategories = companyCategoryNames.filter((n) => n.toLowerCase() !== "other");
  for (const studentField of studentStudyFields) {
    const normalized = studentField.toLowerCase();
    const directMatch = explicitCategories.some(
      (name) => name.toLowerCase().includes(normalized) || normalized.includes(name.toLowerCase())
    );
    if (directMatch) {
      if (companyId) console.log("[Matching] studyFieldMatches: company", companyId, "MATCH (student:", studentField, "| categories:", companyCategoryNames.join(", "), ")");
      return true;
    }
    if (allowWordMatchForFillUp && explicitCategories.length > 0) {
      const firstWordMatch = explicitCategories.some((name) => {
        const firstWord = name.trim().split(/\s+/)[0];
        if (!firstWord || firstWord.length < 4) return false;
        return normalized.includes(firstWord.toLowerCase());
      });
      if (firstWordMatch) return true;
    }
  }
  if (companyId) console.log("[Matching] studyFieldMatches: company", companyId, "NO MATCH (student:", studentStudyFields.join(", "), "| company categories:", companyCategoryNames.join(", "), ")");
  return false;
}


// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------
// The Directus implementation guessed at the schema at runtime: every lookup
// was tried against two collection-name casings, company/student filters were
// attempted in six shapes, junction tables were tried under four names, and
// `_in` filters were chunked into batches of 20 because the Directus REST QS
// parser silently truncated longer arrays. All of that is replaced by direct
// queries against known tables.
//
// The scoring logic above this line is unchanged.

/** Ids cross this API as strings; matching tables use integer keys. */
const toInt = (v: string | number): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const MS_INCLUDE = {
  year: true,
  event: true,
  prerequisiteForm: { select: { id: true, name: true, slug: true } },
} as const;

/** Maps a Prisma matching_software row to the legacy shape. */
function shapeMatchingSoftware(row: Record<string, any> | null): MatchingSoftware | null {
  if (!row) return null;
  const { year_id, event_id, prerequisite_form, prerequisiteForm, ...rest } = row;
  return {
    ...rest,
    year: row.year ?? year_id ?? null,
    event: row.event ?? event_id ?? null,
    prerequisite_form: prerequisiteForm ?? prerequisite_form ?? null,
  } as MatchingSoftware;
}

export async function listMatchingSoftware(opts?: {
  eventId?: string;
  yearId?: string;
  active?: boolean;
}) {
  try {
    const yearId = opts?.yearId ? toInt(opts.yearId) : null;

    const rows = await prisma.matchingSoftware.findMany({
      where: {
        ...(opts?.eventId ? { event_id: opts.eventId } : {}),
        ...(yearId != null ? { year_id: yearId } : {}),
        ...(opts?.active !== undefined ? { active: opts.active } : {}),
      },
      include: MS_INCLUDE,
      orderBy: { id: "desc" },
    });

    return rows.map((r) => shapeMatchingSoftware(r)!) as MatchingSoftware[];
  } catch (error) {
    console.error("[listMatchingSoftware] Error:", error);
    throw error;
  }
}

export async function getMatchingSoftwareByEventAndYear(eventId: string, yearId: string): Promise<MatchingSoftware | null> {
  try {
    const items = await listMatchingSoftware({ eventId, yearId, active: true });
    return items.length > 0 ? items[0] : null;
  } catch (error) {
    console.error("[getMatchingSoftwareByEventAndYear] Error:", error);
    return null;
  }
}

/** Get matching software by ID (for config like category_form_fields). */
export async function getMatchingSoftwareById(id: string): Promise<MatchingSoftware | null> {
  try {
    const msId = toInt(id);
    if (msId == null) return null;
    const row = await prisma.matchingSoftware.findUnique({
      where: { id: msId },
      include: MS_INCLUDE,
    });
    return shapeMatchingSoftware(row);
  } catch (error) {
    console.error("[getMatchingSoftwareById] Error:", error);
    return null;
  }
}

/** Get active matching software for an event - uses first active one for that event (year may vary). */
export async function getActiveMatchingSoftwareForEvent(eventId: string): Promise<MatchingSoftware | null> {
  try {
    const row = await prisma.matchingSoftware.findFirst({
      where: { event_id: eventId, active: true },
      include: MS_INCLUDE,
      orderBy: { id: "desc" },
    });
    return shapeMatchingSoftware(row);
  } catch (error) {
    console.error("[getActiveMatchingSoftwareForEvent] Error:", error);
    return null;
  }
}

/** Get first active matching software (for company dashboard - no event context). */
export async function getFirstActiveMatchingSoftware(): Promise<MatchingSoftware | null> {
  try {
    const row = await prisma.matchingSoftware.findFirst({
      where: { active: true },
      include: MS_INCLUDE,
      orderBy: { id: "desc" },
    });
    return shapeMatchingSoftware(row);
  } catch (error) {
    console.error("[getFirstActiveMatchingSoftware] Error:", error);
    return null;
  }
}

const OCIA_DIMENSIONS: OCIAType[] = ["Clan", "Adhocracy", "Market", "Hierarchy"];

/** Check if response is complete: ocia_answers with 13+ keys OR ocia with all 4 dimensions. */
function isResponseComplete(item: { ocia_answers?: unknown; ocia?: unknown }): boolean {
  const answers = item.ocia_answers as Record<string, unknown> | null | undefined;
  if (answers && typeof answers === "object" && Object.keys(answers).length >= 13) return true;
  const ocia = item.ocia as Record<string, unknown> | null | undefined;
  if (ocia && typeof ocia === "object") {
    const hasAll = OCIA_DIMENSIONS.every((d) => d in ocia && typeof ocia[d] === "number");
    if (hasAll) return true;
  }
  return false;
}

/**
 * Get ALL company IDs that have completed matching software (ocia_answers with
 * 13+ keys or ocia with 4 dims). Completeness is a shape check on JSON, so the
 * rows are still filtered in application code -- but only the rows belonging to
 * this matching software are fetched, rather than every response in the table.
 */
export async function getCompanyMatchingResponseCompletedIds(
  matchingSoftwareId: string,
  _companyIds: string[]
): Promise<Set<string>> {
  const result = new Set<string>();
  try {
    const msId = toInt(matchingSoftwareId);
    if (msId == null) return result;

    const rows = await prisma.companyMatchingResponse.findMany({
      where: { matching_software: msId, ocia_answers: { not: Prisma.DbNull } },
      select: { company_id: true, ocia_answers: true, ocia: true },
    });

    for (const item of rows) {
      if (item.company_id && isResponseComplete(item)) {
        result.add(item.company_id);
      }
    }
  } catch (error) {
    console.error("[getCompanyMatchingResponseCompletedIds] Error:", error);
  }
  return result;
}

type StudentDisplay = { id: string; first_name: string | null; last_name: string | null; email: string };

/** Fetch display fields for students, preserving the order of the ids passed in. */
async function fetchStudentsByIds(studentIds: string[]): Promise<StudentDisplay[]> {
  if (studentIds.length === 0) return [];
  const ids = studentIds.map(toInt).filter((n): n is number => n != null);
  if (ids.length === 0) return [];

  const orderMap = new Map(studentIds.map((id, i) => [id, i]));
  const rows = await prisma.student.findMany({
    where: { id: { in: ids } },
    select: { id: true, first_name: true, last_name: true, email: true, full_name: true },
  });

  return rows
    .map((s) => {
      const full = s.full_name ?? null;
      const first = s.first_name ?? (full ? full.split(/\s+/)[0] ?? null : null);
      const last = s.last_name ?? (full ? full.split(/\s+/).slice(1).join(" ") || null : null);
      return { id: String(s.id), first_name: first, last_name: last, email: s.email ?? "" };
    })
    .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
}

/** Get company's OCIA matching response, including students who matched with this company. */
export async function getCompanyMatchingResponse(
  companyId: string,
  matchingSoftwareId: string
): Promise<CompanyMatchingResponse | null> {
  try {
    const msId = toInt(matchingSoftwareId);
    if (msId == null) return null;

    const row = await prisma.companyMatchingResponse.findFirst({
      where: { company_id: companyId, matching_software: msId },
      include: { companyMatchingResponseStudents: { select: { students_id: true } } },
      orderBy: { id: "desc" },
    });
    if (!row) return null;

    const { companyMatchingResponseStudents, company_id, ...rest } = row;
    let studentIds = companyMatchingResponseStudents
      .map((j) => j.students_id)
      .filter((v): v is number => v != null)
      .map(String);

    // Fallback used by the Directus version when the company-side junction was
    // empty: derive the student list from the student-side junction instead.
    if (studentIds.length === 0) {
      const viaStudentSide = await prisma.studentMatchingResponseCompany.findMany({
        where: {
          company_id: companyId,
          studentMatchingResponse: { matching_software: msId },
        },
        select: { studentMatchingResponse: { select: { student_id: true } } },
      });
      studentIds = viaStudentSide
        .map((r) => r.studentMatchingResponse?.student_id)
        .filter((v): v is number => v != null)
        .map(String);
    }

    return {
      ...rest,
      company: company_id,
      students: await fetchStudentsByIds(studentIds),
    } as unknown as CompanyMatchingResponse;
  } catch (error) {
    console.error("[getCompanyMatchingResponse] Error:", error);
    return null;
  }
}

/**
 * Find all students who matched with this company (student has company in their
 * matches). Updates the company_matching_response_students junction.
 * When fewer than MAX_COMPANY_MATCHES: fills up with eligible students
 * (correct study field) ranked by score.
 */
export async function syncCompanyMatchedStudents(
  companyId: string,
  matchingSoftwareId: string
): Promise<CompanyMatchingResponse | null> {
  const existing = await getCompanyMatchingResponse(companyId, matchingSoftwareId);
  if (!existing?.id) return null;

  const msId = toInt(matchingSoftwareId);
  if (msId == null) return null;

  // Student responses that list this company among their matches.
  const matched = await prisma.studentMatchingResponse.findMany({
    where: {
      matching_software: msId,
      studentMatchingResponseCompanies: { some: { company_id: companyId } },
    },
    select: {
      id: true,
      student_id: true,
      riasec: true,
      riasec_answers: true,
      general_info_answers: true,
    },
  });

  const companyOcia = (existing as { ocia?: Record<OCIAType, number> }).ocia ?? { Clan: 0, Adhocracy: 0, Market: 0, Hierarchy: 0 };
  const companyGi: GeneralInfoAnswers = (existing as { general_info_answers?: GeneralInfoAnswers }).general_info_answers ?? {
    work_preference: [],
    company_type: [],
    work_options: [],
  };

  /** Scoring is identical to computeAndStoreCompanyMatches: lower is better. */
  const scoreOf = (
    riasecRaw: unknown,
    riasecAnswers: unknown,
    generalInfo: unknown
  ): number => {
    let riasec = (riasecRaw as Record<RIASECType, number>) ?? {};
    if (
      Object.keys(riasec).length === 0 &&
      riasecAnswers &&
      typeof riasecAnswers === "object"
    ) {
      riasec = computeRiasecFromAnswers(riasecAnswers as Record<string, string>);
    }
    const studentOcia = riasecToOcia(riasec);
    const studentGi: GeneralInfoAnswers = (generalInfo as GeneralInfoAnswers) ?? {
      work_preference: [],
      company_preference: [],
      options_preference: [],
    };
    const ociaScore = ociaSimilarityScore(studentOcia, companyOcia);
    const generalInfoOverlap = countGeneralInfoOverlap(studentGi, companyGi);
    return (ociaScore - generalInfoOverlap * GENERAL_INFO_WEIGHT) / (GENERAL_INFO_WEIGHT + 1);
  };

  const withScores: Array<{ studentId: string; score: number }> = [];
  for (const item of matched) {
    if (item.student_id == null) continue;
    withScores.push({
      studentId: String(item.student_id),
      score: scoreOf(item.riasec, item.riasec_answers, item.general_info_answers),
    });
  }

  // Deduplicate by studentId, keeping best (lowest) score per student
  const bestByStudent = new Map<string, number>();
  for (const { studentId, score } of withScores) {
    const prev = bestByStudent.get(studentId);
    if (prev === undefined || score < prev) bestByStudent.set(studentId, score);
  }
  const deduped = [...bestByStudent.entries()].map(([studentId, score]) => ({ studentId, score }));
  deduped.sort((a, b) => a.score - b.score);
  let uniqueStudentIds = deduped.slice(0, MAX_COMPANY_MATCHES).map((x) => x.studentId);

  // Fill-up: when fewer than MAX_COMPANY_MATCHES, consider every student
  // response for this matching software, filter by study field, score, and fill.
  if (uniqueStudentIds.length < MAX_COMPANY_MATCHES) {
    const msConfig = await getMatchingSoftwareById(matchingSoftwareId);
    const categoryFormFields = (msConfig as { category_form_fields?: Array<{ formId: string; formVersionId: string; fieldName: string }> })?.category_form_fields;
    const companyResponses = await getCompanyMatchingResponsesForMatchingSoftware(matchingSoftwareId, categoryFormFields);
    const companyInfo = companyResponses.find((r) => r.companyId === companyId);
    const categoryNames = companyInfo?.categoryNames ?? [];
    const hasOther = companyInfo?.hasOther ?? false;
    const allowAll = categoryNames.length === 0;

    const allResponses = await prisma.studentMatchingResponse.findMany({
      where: { matching_software: msId },
      select: {
        id: true,
        student_id: true,
        riasec: true,
        riasec_answers: true,
        general_info_answers: true,
        prerequisite_form_response: true,
      },
    });

    const existingStudentIds = new Set(uniqueStudentIds);
    const fillUpWithScores: Array<{ studentId: string; score: number }> = [];
    for (const item of allResponses) {
      if (item.student_id == null) continue;
      const sid = String(item.student_id);
      if (existingStudentIds.has(sid)) continue;

      const studentStudyFields = await resolveStudyFieldForMatching(
        (item.prerequisite_form_response as Record<string, unknown>) ?? undefined
      );
      if (!studyFieldMatches(studentStudyFields, categoryNames, hasOther, companyId, allowAll, true)) continue;

      fillUpWithScores.push({
        studentId: sid,
        score: scoreOf(item.riasec, item.riasec_answers, item.general_info_answers),
      });
    }

    const fillUpBestByStudent = new Map<string, number>();
    for (const { studentId, score } of fillUpWithScores) {
      const prev = fillUpBestByStudent.get(studentId);
      if (prev === undefined || score < prev) fillUpBestByStudent.set(studentId, score);
    }
    const fillUpDeduped = [...fillUpBestByStudent.entries()].map(([studentId, score]) => ({ studentId, score }));
    fillUpDeduped.sort((a, b) => a.score - b.score);
    const needed = MAX_COMPANY_MATCHES - uniqueStudentIds.length;
    uniqueStudentIds = [...uniqueStudentIds, ...fillUpDeduped.slice(0, needed).map((x) => x.studentId)];
  }

  return updateCompanyMatchingResponseStudents(
    existing.id as unknown as number,
    uniqueStudentIds,
    companyId,
    matchingSoftwareId
  );
}

/** Get match counts per company for admin overview. */
export async function getCompanyMatchCounts(
  matchingSoftwareId: string
): Promise<Array<{ companyId: string; companyName: string; matchCount: number }>> {
  const msId = toInt(matchingSoftwareId);
  if (msId == null) return [];

  const rows = await prisma.companyMatchingResponse.findMany({
    where: { matching_software: msId, ocia_answers: { not: Prisma.DbNull } },
    select: {
      company_id: true,
      company: { select: { name: true } },
      _count: { select: { companyMatchingResponseStudents: true } },
    },
  });

  return rows
    .filter((r) => r.company_id)
    .map((r) => ({
      companyId: r.company_id!,
      companyName: r.company?.name ?? "",
      matchCount: r._count.companyMatchingResponseStudents,
    }));
}

/** Clear ALL company_matching_response_students junction rows for this matching_software before sync. */
async function clearAllCompanyMatchingResponseStudentsJunction(
  matchingSoftwareId: string,
  log?: (msg: string) => void
): Promise<void> {
  const msId = toInt(matchingSoftwareId);
  if (msId == null) return;

  const { count } = await prisma.companyMatchingResponseStudent.deleteMany({
    where: { companyMatchingResponse: { matching_software: msId } },
  });
  log?.(`Cleared company_matching_response_students (${count} rows)`);
}

/** List all active matching software IDs (for cron). */
export async function listActiveMatchingSoftwareIds(): Promise<string[]> {
  const rows = await prisma.matchingSoftware.findMany({
    where: { active: true },
    select: { id: true },
  });
  return rows.map((r) => String(r.id));
}

/** Sync matched students for ALL companies that have a matching response for this matching software. */
export async function syncAllCompanyMatchedStudents(
  matchingSoftwareId: string,
  log?: (msg: string) => void
): Promise<{ synced: number; errors: string[] }> {
  await clearAllCompanyMatchingResponseStudentsJunction(matchingSoftwareId, log);
  const companyIds = await getCompanyMatchingResponseCompletedIds(matchingSoftwareId, []);
  const ids = Array.from(companyIds);
  log?.(`Syncing company matches: ${ids.length} companies`);

  const errors: string[] = [];
  let synced = 0;
  for (const companyId of ids) {
    try {
      const result = await syncCompanyMatchedStudents(companyId, matchingSoftwareId);
      if (result) synced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${companyId}: ${msg}`);
      log?.(`Error company ${companyId}: ${msg}`);
    }
  }
  log?.(`Company sync done: ${synced} synced, ${errors.length} errors`);
  return { synced, errors };
}

/** Recompute matches for ALL students, then sync company matches. Full update. Returns logs for admin display. */
export async function fullUpdateAllMatches(
  matchingSoftwareId: string
): Promise<{ studentsUpdated: number; companiesSynced: number; errors: string[]; logs: string[] }> {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
    console.log("[Matching]", msg);
  };

  log("Starting full update: 1) Recompute all student matches, 2) Sync company matches");

  const msId = toInt(matchingSoftwareId);
  const studentResponses = msId == null
    ? []
    : await prisma.studentMatchingResponse.findMany({
        where: { matching_software: msId },
        select: {
          id: true,
          riasec: true,
          prerequisite_form_response: true,
          general_info_answers: true,
        },
      });

  log(`Found ${studentResponses.length} student responses to recompute`);

  let studentsUpdated = 0;
  const errors: string[] = [];

  for (let i = 0; i < studentResponses.length; i++) {
    const resp = studentResponses[i];
    const respId = String(resp.id);
    const riasec = (resp.riasec as Record<RIASECType, number>) ?? { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    try {
      await computeAndStoreCompanyMatches(
        respId,
        matchingSoftwareId,
        riasec,
        (resp.prerequisite_form_response as Record<string, unknown>) ?? undefined,
        (resp.general_info_answers as GeneralInfoAnswers) ?? undefined
      );
      studentsUpdated++;
      if ((i + 1) % 50 === 0 || i === studentResponses.length - 1) {
        log(`Student matches: ${i + 1}/${studentResponses.length} recomputed`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Student ${respId}: ${msg}`);
      log(`Error student ${respId}: ${msg}`);
    }
  }

  log(`Student recompute done: ${studentsUpdated}/${studentResponses.length} updated, ${errors.length} errors`);

  const { synced } = await syncAllCompanyMatchedStudents(matchingSoftwareId, log);

  log(`Full update complete. Students: ${studentsUpdated}, Companies: ${synced}`);

  // Truncate to avoid exceeding server action response size limit (~1MB)
  const maxLogs = 800;
  const truncatedLogs = logs.length > maxLogs
    ? [...logs.slice(0, 50), `... (${logs.length - maxLogs} lines omitted) ...`, ...logs.slice(-maxLogs + 50)]
    : logs;
  const truncatedErrors = errors.length > 100
    ? [...errors.slice(0, 100), `... and ${errors.length - 100} more errors`]
    : errors;

  return { studentsUpdated, companiesSynced: synced, errors: truncatedErrors, logs: truncatedLogs };
}

/**
 * Replace the company_matching_response_students junction for one response.
 *
 * The Directus version inserted junction rows one request at a time, so a full
 * sync of ~186 companies at 50 students each issued roughly 9300 individual
 * writes. createMany does it in one statement per company.
 */
async function updateCompanyMatchingResponseStudents(
  companyResponseId: string | number,
  studentIds: string[],
  companyId: string,
  matchingSoftwareId: string
): Promise<CompanyMatchingResponse | null> {
  const responseId = toInt(companyResponseId);
  if (responseId == null) return null;

  const ids = studentIds.map(toInt).filter((n): n is number => n != null);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.companyMatchingResponseStudent.deleteMany({
        where: { company_matching_response_id: responseId },
      });
      if (ids.length > 0) {
        await tx.companyMatchingResponseStudent.createMany({
          data: ids.map((students_id) => ({
            company_matching_response_id: responseId,
            students_id,
          })),
        });
      }
    });
  } catch (err) {
    console.error(
      "[Matching] updateCompanyMatchingResponseStudents: error:",
      err instanceof Error ? err.message : err
    );
    return null;
  }

  return getCompanyMatchingResponse(companyId, matchingSoftwareId);
}

/** Get general_info_answers for multiple companies. Returns map of companyId -> GeneralInfoAnswers. */
export async function getCompanyGeneralInfoForCompanies(
  matchingSoftwareId: string,
  companyIds: string[]
): Promise<Record<string, GeneralInfoAnswers>> {
  if (companyIds.length === 0) return {};
  const msId = toInt(matchingSoftwareId);
  if (msId == null) return {};

  const rows = await prisma.companyMatchingResponse.findMany({
    where: { matching_software: msId, company_id: { in: companyIds } },
    select: { company_id: true, general_info_answers: true },
  });

  const result: Record<string, GeneralInfoAnswers> = {};
  for (const item of rows) {
    if (!item.company_id) continue;
    result[item.company_id] = (item.general_info_answers as GeneralInfoAnswers) ?? {
      work_preference: [],
      company_type: [],
      work_options: [],
    };
  }
  return result;
}

/** Create or update company's OCIA matching response. */
export async function createOrUpdateCompanyMatchingResponse(data: {
  company: string;
  matching_software: string;
  ocia_answers: Record<string, string>;
  ocia: Record<OCIAType, number>;
  general_info_answers?: GeneralInfoAnswers;
}): Promise<CompanyMatchingResponse | null> {
  const msId = toInt(data.matching_software);
  if (msId == null) throw new Error("Invalid matching software id");

  const payload = {
    ocia_answers: data.ocia_answers,
    ocia: data.ocia,
    general_info_answers:
      data.general_info_answers ?? { work_preference: [], company_type: [], work_options: [] },
  };

  const existing = await prisma.companyMatchingResponse.findFirst({
    where: { company_id: data.company, matching_software: msId },
    select: { id: true },
  });

  const row = existing
    ? await prisma.companyMatchingResponse.update({
        where: { id: existing.id },
        data: { ...payload, date_updated: new Date() },
      })
    : await prisma.companyMatchingResponse.create({
        data: { ...payload, company_id: data.company, matching_software: msId },
      });

  return row as unknown as CompanyMatchingResponse;
}

export async function createMatchingSoftware(data: {
  year: string;
  event: string;
  prerequisite_form?: string;
  active?: boolean;
}): Promise<MatchingSoftware | null> {
  const row = await prisma.matchingSoftware.create({
    data: {
      year_id: toInt(data.year),
      event_id: data.event,
      prerequisite_form: data.prerequisite_form ? toInt(data.prerequisite_form) : null,
      active: data.active ?? true,
    },
    include: MS_INCLUDE,
  });
  return shapeMatchingSoftware(row);
}

/** Update matching software (e.g. toggle active, companies_can_view_matches). */
export async function updateMatchingSoftware(
  id: string,
  data: { active?: boolean; companies_can_view_matches?: boolean }
): Promise<MatchingSoftware | null> {
  const msId = toInt(id);
  if (msId == null) return null;

  const payload: Record<string, unknown> = {};
  if (data.active !== undefined) payload.active = data.active;
  if (data.companies_can_view_matches !== undefined) {
    payload.companies_can_view_matches = data.companies_can_view_matches;
  }
  if (Object.keys(payload).length === 0) return null;

  const row = await prisma.matchingSoftware.update({
    where: { id: msId },
    data: { ...payload, date_updated: new Date() },
    include: MS_INCLUDE,
  });
  return shapeMatchingSoftware(row);
}

/** Get the logged-in student's response. */
export async function getStudentMatchingResponse(
  studentId: string | number,
  matchingSoftwareId: string
): Promise<StudentMatchingResponse | null> {
  try {
    const sid = toInt(studentId);
    const msId = toInt(matchingSoftwareId);
    if (sid == null || msId == null) return null;

    const row = await prisma.studentMatchingResponse.findFirst({
      where: { student_id: sid, matching_software: msId },
      include: { studentMatchingResponseCompanies: { select: { company_id: true } } },
      orderBy: { id: "desc" },
    });
    if (!row) return null;

    const { studentMatchingResponseCompanies, student_id, ...rest } = row;
    return {
      ...rest,
      student: student_id,
      companies: studentMatchingResponseCompanies
        .map((j) => j.company_id)
        .filter((v): v is string => v != null),
    } as unknown as StudentMatchingResponse;
  } catch (error) {
    console.error("[getStudentMatchingResponse] Error:", error);
    return null;
  }
}

export async function createStudentMatchingResponse(data: {
  student: string;
  matching_software: string;
  riasec_answers: Record<string, string>;
  riasec: Record<RIASECType, number>;
  prerequisite_form_response?: Record<string, unknown>;
  general_info_answers?: GeneralInfoAnswers;
}): Promise<StudentMatchingResponse | null> {
  const sid = toInt(data.student);
  const msId = toInt(data.matching_software);
  if (sid == null || msId == null) throw new Error("Failed to create student matching response");

  const created = await prisma.studentMatchingResponse.create({
    data: {
      student_id: sid,
      matching_software: msId,
      riasec_answers: data.riasec_answers,
      riasec: data.riasec,
      prerequisite_form_response:
        (data.prerequisite_form_response as Prisma.InputJsonValue) ?? Prisma.DbNull,
      general_info_answers:
        data.general_info_answers ?? { work_preference: [], company_preference: [], options_preference: [] },
    },
  });

  try {
    await computeAndStoreCompanyMatches(
      String(created.id),
      data.matching_software,
      data.riasec,
      data.prerequisite_form_response ?? undefined,
      data.general_info_answers ?? undefined
    );
  } catch (matchErr) {
    console.error("[createStudentMatchingResponse] Matching failed (non-fatal):", matchErr);
  }

  // Company matches are synced daily at 0:00 or via the admin "Update matches" button.
  const refetched = await getStudentMatchingResponse(data.student, data.matching_software);
  return refetched ?? (created as unknown as StudentMatchingResponse);
}

/** Get a student's latest form response for a given form (for prerequisite check). */
export async function getStudentFormResponseForForm(
  studentId: string,
  formId: string
): Promise<{ id: string; form_version_id: string; data: Record<string, unknown> } | null> {
  try {
    const { getStudentLatestFormResponseForForm, listFormVersionsForServer } = await import("./forms");
    const versions = await listFormVersionsForServer(formId);
    const versionIds = versions.map((v) => v.id);
    return getStudentLatestFormResponseForForm(studentId, versionIds);
  } catch (error) {
    console.error("[getStudentFormResponseForForm] Error:", error);
    return null;
  }
}

/** Get all company matching responses for a matching software, with company and category. */
async function getCompanyMatchingResponsesForMatchingSoftware(
  matchingSoftwareId: string,
  categoryFormFields?: Array<{ formId: string; formVersionId: string; fieldName: string }>
): Promise<Array<{ companyId: string; ocia: Record<OCIAType, number>; categoryNames: string[]; hasOther: boolean; generalInfo: GeneralInfoAnswers }>> {
  const msId = toInt(matchingSoftwareId);
  if (msId == null) return [];

  let formCategoriesByCompany = new Map<string, string[]>();
  if (categoryFormFields && categoryFormFields.length > 0) {
    const { getCompanyCategoriesFromFormResponses } = await import("./forms");
    formCategoriesByCompany = await getCompanyCategoriesFromFormResponses(categoryFormFields);
  }

  const rows = await prisma.companyMatchingResponse.findMany({
    where: { matching_software: msId },
    select: {
      company_id: true,
      ocia: true,
      general_info_answers: true,
      company: {
        select: {
          id: true,
          companyMasters: { select: { master: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  return rows
    .filter((item) => item.company?.id)
    .map((item) => {
      const companyId = item.company!.id;
      // getCompanyCategoryNames expects the legacy junction-wrapped shape.
      const fromProfile = getCompanyCategoryNames({
        category: item.company!.companyMasters.map((m) => ({ master_id: m.master })),
      });
      const fromForm = formCategoriesByCompany.get(companyId) ?? [];
      const categoryNames = fromForm.length > 0 ? fromForm : fromProfile;
      const hasOther = categoryNames.some((n) => n.toLowerCase() === "other");
      const generalInfo: GeneralInfoAnswers = (item.general_info_answers as GeneralInfoAnswers) ?? {
        work_preference: [],
        company_type: [],
        work_options: [],
      };
      return {
        companyId,
        ocia: (item.ocia as Record<OCIAType, number>) ?? { Clan: 0, Adhocracy: 0, Market: 0, Hierarchy: 0 },
        categoryNames,
        hasOther,
        generalInfo,
      };
    });
}

const TARGET_MATCH_COUNT = 30; // Per student: top 30 companies
const MAX_COMPANY_MATCHES = 50; // Per company: top 50 students by score

const GENERAL_INFO_WEIGHT = 3; // Each overlapping general-info option reduces score by this much (lower score = better match)

/**
 * Compute company matches for a student and store in
 * student_matching_response_company.
 * Uses: study_field match + general info overlap + OCIA similarity (RIASEC→OCIA).
 * General info is between study field and OCIA in importance.
 * Widens margin until exactly 30 matches.
 */
export async function computeAndStoreCompanyMatches(
  studentResponseId: string,
  matchingSoftwareId: string,
  riasec: Record<RIASECType, number>,
  prerequisiteFormResponse?: Record<string, unknown> | null,
  studentGeneralInfo?: GeneralInfoAnswers | null
): Promise<string[]> {
  const studentOcia = riasecToOcia(riasec);
  const studentStudyFields = await resolveStudyFieldForMatching(prerequisiteFormResponse ?? undefined);
  const studentGi: GeneralInfoAnswers = studentGeneralInfo ?? {
    work_preference: [],
    company_preference: [],
    options_preference: [],
  };

  const msConfig = await getMatchingSoftwareById(matchingSoftwareId);
  const categoryFormFields = (msConfig as { category_form_fields?: Array<{ formId: string; formVersionId: string; fieldName: string }> })?.category_form_fields;
  const companyResponses = await getCompanyMatchingResponsesForMatchingSoftware(matchingSoftwareId, categoryFormFields);

  const eligible = companyResponses.filter((cr) =>
    studyFieldMatches(studentStudyFields, cr.categoryNames, cr.hasOther, cr.companyId)
  );

  if (eligible.length === 0) {
    await updateStudentMatchingResponseCompanies(studentResponseId, []);
    return [];
  }

  const withScores = eligible.map((cr) => {
    const ociaScore = ociaSimilarityScore(studentOcia, cr.ocia);
    const generalInfoOverlap = countGeneralInfoOverlap(studentGi, cr.generalInfo);
    const combinedScore = (ociaScore - generalInfoOverlap * GENERAL_INFO_WEIGHT) / (GENERAL_INFO_WEIGHT + 1);
    return {
      companyId: cr.companyId,
      score: combinedScore,
    };
  });

  withScores.sort((a, b) => a.score - b.score);

  let margin = 0;
  const bestScore = withScores[0]?.score ?? 0;
  let matches: string[] = [];

  while (matches.length < TARGET_MATCH_COUNT && margin <= 2) {
    const threshold = bestScore + margin;
    matches = withScores.filter((m) => m.score <= threshold).map((m) => m.companyId);
    if (matches.length >= TARGET_MATCH_COUNT) {
      matches = matches.slice(0, TARGET_MATCH_COUNT);
      break;
    }
    margin += 0.05; // scores are 0–1 scale
  }

  if (matches.length > TARGET_MATCH_COUNT) {
    matches = matches.slice(0, TARGET_MATCH_COUNT);
  }

  await updateStudentMatchingResponseCompanies(studentResponseId, matches);
  return matches;
}

/** Compute match scores for display (same formula as computeAndStoreCompanyMatches). Lower = better. */
export async function getMatchScoresForResponse(
  riasec: Record<RIASECType, number>,
  studentGeneralInfo: GeneralInfoAnswers | null | undefined,
  matchingSoftwareId: string,
  companyIds: string[]
): Promise<Record<string, number>> {
  if (companyIds.length === 0) return {};
  const studentOcia = riasecToOcia(riasec);
  const studentGi: GeneralInfoAnswers = studentGeneralInfo ?? {
    work_preference: [],
    company_preference: [],
    options_preference: [],
  };
  const msConfig = await getMatchingSoftwareById(matchingSoftwareId);
  const categoryFormFields = (msConfig as { category_form_fields?: Array<{ formId: string; formVersionId: string; fieldName: string }> })?.category_form_fields;
  const companyResponses = await getCompanyMatchingResponsesForMatchingSoftware(matchingSoftwareId, categoryFormFields);
  const byId = new Map(companyResponses.map((cr) => [cr.companyId, cr]));
  const result: Record<string, number> = {};
  for (const companyId of companyIds) {
    const cr = byId.get(companyId);
    if (!cr) continue;
    const ociaScore = ociaSimilarityScore(studentOcia, cr.ocia);
    const generalInfoOverlap = countGeneralInfoOverlap(studentGi, cr.generalInfo);
    const combinedScore = (ociaScore - generalInfoOverlap * GENERAL_INFO_WEIGHT) / (GENERAL_INFO_WEIGHT + 1);
    result[companyId] = Math.round(combinedScore * 100) / 100;
  }
  return result;
}

const MATCHES_RECOMPUTE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Get when matches were last computed. Returns null if unknown or no matches. */
export async function getMatchesLastComputedAt(responseId: string): Promise<Date | null> {
  const id = toInt(responseId);
  if (id == null) return null;

  const row = await prisma.studentMatchingResponse.findUnique({
    where: { id },
    select: { matches_last_computed_at: true },
  });
  return row?.matches_last_computed_at ?? null;
}

/** Returns true if matches should be recomputed: no matches yet, or last compute >24h ago. */
export async function shouldRecomputeMatches(responseId: string): Promise<boolean> {
  const matchCount = (await getMatchedCompanyIdsForResponse(responseId)).length;
  if (matchCount === 0) return true; // No matches yet – always recompute to pick up new companies
  const lastAt = await getMatchesLastComputedAt(responseId);
  if (!lastAt) return true;
  return Date.now() - lastAt.getTime() > MATCHES_RECOMPUTE_INTERVAL_MS;
}

/** Get company IDs matched to a student response (from junction). */
export async function getMatchedCompanyIdsForResponse(responseId: string): Promise<string[]> {
  const id = toInt(responseId);
  if (id == null) return [];

  const rows = await prisma.studentMatchingResponseCompany.findMany({
    where: { student_matching_response_id: id },
    select: { company_id: true },
  });
  return rows.map((r) => r.company_id).filter((v): v is string => v != null);
}

/** Fetch matched companies for a student response by reading the junction table directly. */
export async function getMatchedCompaniesForResponse(
  responseId: string
): Promise<MatchedCompany[]> {
  const ids = await getMatchedCompanyIdsForResponse(responseId);
  return ids.length > 0 ? getCompaniesByIds(ids) : [];
}

export type MatchedCompany = { id: string; name?: string; logo?: string; status?: string; options?: unknown[] };

/** Fetch company id, name, logo, status, options for given IDs (options needed for sub-option checks). */
export async function getCompaniesByIds(
  companyIds: string[]
): Promise<MatchedCompany[]> {
  if (companyIds.length === 0) return [];
  try {
    const rows = await prisma.company.findMany({
      where: { id: { in: companyIds } },
      include: COMPANY_INCLUDE,
    });
    return rows.map(shapeCompany) as MatchedCompany[];
  } catch (err) {
    console.error("[getCompaniesByIds] Error:", err);
    return [];
  }
}

/** Replace the student_matching_response_company junction for one response. */
async function updateStudentMatchingResponseCompanies(responseId: string, companyIds: string[]): Promise<void> {
  const id = toInt(responseId);
  if (id == null) return;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.studentMatchingResponseCompany.deleteMany({
        where: { student_matching_response_id: id },
      });
      if (companyIds.length > 0) {
        await tx.studentMatchingResponseCompany.createMany({
          data: companyIds.map((company_id) => ({
            student_matching_response_id: id,
            company_id,
          })),
        });
      }
      // Records when matches were last computed; used with the 24h throttle so
      // they are not recomputed on every page visit.
      await tx.studentMatchingResponse.update({
        where: { id },
        data: { matches_last_computed_at: new Date() },
      });
    });
  } catch (err) {
    console.error(
      "[Matching] updateStudentMatchingResponseCompanies: failed:",
      err instanceof Error ? err.message : err
    );
  }
}
