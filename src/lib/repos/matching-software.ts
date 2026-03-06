// lib/repos/matching-software.ts
"use server";

import { readItems, createItem, updateItem, deleteItems } from "@directus/sdk";
import { getAuthedDirectusOrThrow, getServerDirectusClient } from "@/lib/directus";
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

/** Sum of absolute differences between OCIA profiles (lower = more similar). Both inputs are 0–100; returns 0–1. */
function ociaSimilarityScore(studentOcia: Record<OCIAType, number>, companyOcia: Record<OCIAType, number>): number {
  const types: OCIAType[] = ["Clan", "Adhocracy", "Market", "Hierarchy"];
  const raw = types.reduce((sum, t) => sum + Math.abs((studentOcia[t] ?? 0) - (companyOcia[t] ?? 0)), 0) / types.length;
  return raw / 100; // normalize to 0–1 so comparable with generalInfoOverlap
}

const STUDY_FIELD_KEYS = [
  "course_of_study", // e.g. "Artificial Intelligence"
  "faculty",         // e.g. "Engineering Technology"
  "study_field",
  "study",
  "master",
  "program",
  "masters",
  "master_degree",
  "master_degrees",
];

/** Extract raw study field value(s) from form data. Handles strings, objects with name, and arrays (master-degrees multiselect).
 * Collects from all STUDY_FIELD_KEYS so both course_of_study and faculty (etc.) are used for matching across form versions. */
function extractStudyFieldRawValues(data: Record<string, unknown> | null | undefined): string[] {
  if (!data || typeof data !== "object") {
    console.log("[Matching] extractStudyFieldRawValues: no data or not object");
    return [];
  }
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
 * - Students with "Other" or from a faculty without masters match companies that have "Other" in their categories. */
function studyFieldMatches(
  studentStudyFields: string[],
  companyCategoryNames: string[],
  companyHasOther: boolean,
  companyId?: string
): boolean {
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
  }
  if (companyId) console.log("[Matching] studyFieldMatches: company", companyId, "NO MATCH (student:", studentStudyFields.join(", "), "| company categories:", companyCategoryNames.join(", "), ")");
  return false;
}

const MATCHING_SOFTWARE_COLLECTIONS = ["Matching_Software", "matching_software"] as const;
const STUDENT_MATCHING_RESPONSE_COLLECTIONS = ["student_matching_response", "Student_Matching_Response"] as const;
const COMPANY_MATCHING_RESPONSE_COLLECTIONS = ["company_matching_response", "Company_Matching_Response"] as const;

async function listFromCollection(
  client: Awaited<ReturnType<typeof getAuthedDirectusOrThrow>>,
  collection: string,
  filter: Record<string, unknown>
) {
  return client.request(
    readItems(collection as any, {
      fields: ["*", "year.*", "event.*", "prerequisite_form.id", "prerequisite_form.name", "prerequisite_form.slug"],
      ...(Object.keys(filter).length > 0 ? { filter } : {}),
      sort: ["-id"],
    })
  );
}

export async function listMatchingSoftware(opts?: {
  eventId?: string;
  yearId?: string;
  active?: boolean;
}) {
  try {
    const client = await getAuthedDirectusOrThrow();
    const filter: Record<string, unknown> = {};
    if (opts?.eventId) filter.event = { _eq: opts.eventId };
    if (opts?.yearId) filter.year = { _eq: opts.yearId };
    if (opts?.active !== undefined) filter.active = { _eq: opts.active };

    let lastError: unknown;
    for (const collection of MATCHING_SOFTWARE_COLLECTIONS) {
      try {
        const items = (await listFromCollection(client, collection, filter)) as unknown as MatchingSoftware[];
        return items;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
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
    const client = await getServerDirectusClient();
    const fields = ["*", "year.*", "event.*", "prerequisite_form.id", "prerequisite_form.name", "prerequisite_form.slug"];
    for (const collection of MATCHING_SOFTWARE_COLLECTIONS) {
      try {
        const item = (await client.request(
          readItems(collection as any, {
            fields,
            filter: { id: { _eq: id } },
            limit: 1,
          })
        )) as unknown as MatchingSoftware[];
        return item.length > 0 ? item[0] : null;
      } catch {
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error("[getMatchingSoftwareById] Error:", error);
    return null;
  }
}

/** Get active matching software for an event - uses first active one for that event (year may vary).
 * Uses server client (same as student login) so it works for logged-in students. */
export async function getActiveMatchingSoftwareForEvent(eventId: string): Promise<MatchingSoftware | null> {
  try {
    const client = await getServerDirectusClient();
    let lastError: unknown;
    for (const collection of MATCHING_SOFTWARE_COLLECTIONS) {
      try {
        const items = (await client.request(
          readItems(collection as any, {
            fields: ["*", "year.*", "event.*", "prerequisite_form.id", "prerequisite_form.name", "prerequisite_form.slug"],
            filter: { event: { _eq: eventId }, active: { _eq: true } },
            limit: 1,
          })
        )) as unknown as MatchingSoftware[];
        const ms = items.length > 0 ? items[0] : null;
        console.log("[getActiveMatchingSoftwareForEvent] eventId:", eventId, "collection:", collection, "found:", !!ms, "ms.id:", ms?.id);
        return ms;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  } catch (error) {
    console.error("[getActiveMatchingSoftwareForEvent] Error:", error);
    return null;
  }
}

/** Get first active matching software (for company dashboard - no event context). */
export async function getFirstActiveMatchingSoftware(): Promise<MatchingSoftware | null> {
  try {
    const client = await getServerDirectusClient();
    for (const collection of MATCHING_SOFTWARE_COLLECTIONS) {
      try {
        const items = (await client.request(
          readItems(collection as any, {
            fields: ["*", "year.*", "event.*", "prerequisite_form.id", "prerequisite_form.name", "prerequisite_form.slug"],
            filter: { active: { _eq: true } },
            limit: 1,
          })
        )) as unknown as MatchingSoftware[];
        if (items.length > 0) return items[0];
      } catch {
        // Try next collection
      }
    }
    return null;
  } catch (error) {
    console.error("[getFirstActiveMatchingSoftware] Error:", error);
    return null;
  }
}

/** Normalize company ID from Directus (may return string, number, or object { id }) */
function normalizeCompanyIdForMatching(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && v !== null && "id" in (v as object)) return String((v as { id: unknown }).id).trim() || null;
  return null;
}

const OCIA_DIMENSIONS: OCIAType[] = ["Clan", "Adhocracy", "Market", "Hierarchy"];

/** Check if response is complete: ocia_answers with 13+ keys OR ocia with all 4 dimensions. */
function isResponseComplete(item: { ocia_answers?: Record<string, unknown>; ocia?: Record<string, unknown> }): boolean {
  if (item.ocia_answers && Object.keys(item.ocia_answers).length >= 13) return true;
  const ocia = item.ocia;
  if (ocia && typeof ocia === "object") {
    const hasAll = OCIA_DIMENSIONS.every((d) => d in ocia && typeof (ocia as Record<string, unknown>)[d] === "number");
    if (hasAll) return true;
  }
  return false;
}

/** Get ALL company IDs that have completed matching software (ocia_answers with 13+ keys or ocia with 4 dims).
 * Fetches without filtering by company list so admin overview shows correct status for every company.
 * Handles PascalCase field names (Matching_Software) for Directus schema variants. */
export async function getCompanyMatchingResponseCompletedIds(
  matchingSoftwareId: string,
  _companyIds: string[]
): Promise<Set<string>> {
  const result = new Set<string>();
  const msIdStr = String(matchingSoftwareId);
  const msIdNum = /^\d+$/.test(msIdStr) ? Number(matchingSoftwareId) : null;
  const matchesMs = (ms: unknown) => {
    if (ms == null) return false;
    const id = typeof ms === "object" && ms !== null && "id" in (ms as object) ? (ms as { id: unknown }).id : ms;
    const s = String(id);
    const n = typeof id === "number" ? id : /^\d+$/.test(s) ? Number(s) : NaN;
    return s === msIdStr || (msIdNum != null && n === msIdNum);
  };
  try {
    const client = await getServerDirectusClient();
    const fields = ["company", "ocia_answers", "ocia", "matching_software"];
    for (const collection of COMPANY_MATCHING_RESPONSE_COLLECTIONS) {
      try {
        const items = (await client.request(
          readItems(collection as any, {
            fields,
            filter: { ocia_answers: { _nnull: true } },
            limit: 10000, // Explicit high limit; Directus caps at 100 by default
          })
        )) as unknown as Array<CompanyMatchingResponse & { matching_software?: unknown }>;
        for (const item of items) {
          if (!matchesMs(item.matching_software)) continue;
          const companyId = normalizeCompanyIdForMatching(item.company);
          if (companyId && isResponseComplete(item)) {
            result.add(companyId);
          }
        }
        return result;
      } catch {
        continue;
      }
    }
  } catch (error) {
    console.error("[getCompanyMatchingResponseCompletedIds] Error:", error);
  }
  return result;
}

/** Get company's OCIA matching response. */
export async function getCompanyMatchingResponse(
  companyId: string,
  matchingSoftwareId: string
): Promise<CompanyMatchingResponse | null> {
  try {
    const client = await getServerDirectusClient();
    const fields = ["id", "company", "matching_software", "ocia_answers", "ocia", "general_info_answers"];
    const filter = { company: { _eq: companyId }, matching_software: { _eq: matchingSoftwareId } };

    for (const collection of COMPANY_MATCHING_RESPONSE_COLLECTIONS) {
      try {
        const items = await client.request(
          readItems(collection as any, { fields, filter, limit: 1, sort: ["-id"] })
        ) as unknown as CompanyMatchingResponse[];
        if (items.length > 0) return items[0];
      } catch {
        // Try next collection name
      }
    }
    return null;
  } catch (error) {
    console.error("[getCompanyMatchingResponse] Error:", error);
    return null;
  }
}

/** Get general_info_answers for multiple companies. Returns map of companyId -> GeneralInfoAnswers. */
export async function getCompanyGeneralInfoForCompanies(
  matchingSoftwareId: string,
  companyIds: string[]
): Promise<Record<string, GeneralInfoAnswers>> {
  if (companyIds.length === 0) return {};
  const client = await getServerDirectusClient();
  const fields = ["company", "general_info_answers"];
  const filter = {
    matching_software: { _eq: matchingSoftwareId },
    company: { _in: companyIds },
  };
  for (const collection of COMPANY_MATCHING_RESPONSE_COLLECTIONS) {
    try {
      const items = (await client.request(
        readItems(collection as any, { fields, filter, limit: -1 })
      )) as unknown as Array<{ company: string | { id: string }; general_info_answers?: GeneralInfoAnswers }>;
      const result: Record<string, GeneralInfoAnswers> = {};
      for (const item of items) {
        const companyId = typeof item.company === "string" ? item.company : item.company?.id;
        if (companyId) {
          result[companyId] = item.general_info_answers ?? {
            work_preference: [],
            company_type: [],
            work_options: [],
          };
        }
      }
      return result;
    } catch {
      // Try next collection
    }
  }
  return {};
}

/** Create or update company's OCIA matching response. */
export async function createOrUpdateCompanyMatchingResponse(data: {
  company: string;
  matching_software: string;
  ocia_answers: Record<string, string>;
  ocia: Record<OCIAType, number>;
  general_info_answers?: GeneralInfoAnswers;
}): Promise<CompanyMatchingResponse | null> {
  const client = await getServerDirectusClient();
  const payload = {
    company: data.company,
    matching_software: data.matching_software,
    ocia_answers: data.ocia_answers,
    ocia: data.ocia,
    general_info_answers: data.general_info_answers ?? { work_preference: [], company_type: [], work_options: [] },
  };

  const existing = await getCompanyMatchingResponse(data.company, data.matching_software);

  for (const collection of COMPANY_MATCHING_RESPONSE_COLLECTIONS) {
    try {
      if (existing) {
        const updated = (await client.request(
          updateItem(collection as any, existing.id, payload)
        )) as unknown as CompanyMatchingResponse;
        return updated;
      }
    } catch {
      // Try next collection for update
    }
  }

  if (!existing) {
    for (const collection of COMPANY_MATCHING_RESPONSE_COLLECTIONS) {
      try {
        const result = (await client.request(createItem(collection as any, payload))) as unknown as CompanyMatchingResponse;
        return result;
      } catch {
        // Try next collection for create
      }
    }
  }

  console.error("[createOrUpdateCompanyMatchingResponse] Failed for all collections");
  throw new Error("Failed to save company matching response");
}

export async function createMatchingSoftware(data: {
  year: string;
  event: string;
  prerequisite_form?: string;
  active?: boolean;
}): Promise<MatchingSoftware | null> {
  const client = await getAuthedDirectusOrThrow();
  const payload = {
    year: data.year,
    event: data.event,
    prerequisite_form: data.prerequisite_form || null,
    active: data.active ?? true,
  };
  let lastError: unknown;
  for (const collection of MATCHING_SOFTWARE_COLLECTIONS) {
    try {
      const result = (await client.request(createItem(collection as any, payload))) as unknown as MatchingSoftware;
      return result;
    } catch (e) {
      lastError = e;
    }
  }
  console.error("[createMatchingSoftware] Error:", lastError);
  throw lastError;
}

/** Update matching software (e.g. toggle active). */
export async function updateMatchingSoftware(
  id: string,
  data: { active?: boolean }
): Promise<MatchingSoftware | null> {
  const client = await getAuthedDirectusOrThrow();
  const payload: Record<string, unknown> = {};
  if (data.active !== undefined) payload.active = data.active;

  if (Object.keys(payload).length === 0) return null;

  let lastError: unknown;
  for (const collection of MATCHING_SOFTWARE_COLLECTIONS) {
    try {
      const result = (await client.request(
        updateItem(collection as any, id, payload)
      )) as unknown as MatchingSoftware;
      return result;
    } catch (e) {
      lastError = e;
    }
  }
  console.error("[updateMatchingSoftware] Error:", lastError);
  throw lastError;
}

/** Get the logged-in student's response. Collection has student (M2O) and matching_software (M2O) fields. */
export async function getStudentMatchingResponse(
  studentId: string | number,
  matchingSoftwareId: string
): Promise<StudentMatchingResponse | null> {
  try {
    const client = await getServerDirectusClient();
    const fields = ["id", "student", "matching_software", "riasec_answers", "riasec", "prerequisite_form_response", "general_info_answers", "companies"];
    // Try both string and number - Directus may store student FK as integer (e.g. 5) or UUID string
    const studentValues: (string | number)[] = [studentId, String(studentId)];
    if (typeof studentId === "string" && /^\d+$/.test(studentId)) {
      studentValues.push(Number(studentId));
    }
    console.log("[getStudentMatchingResponse] Looking up studentId:", studentId, "matchingSoftwareId:", matchingSoftwareId, "studentValues to try:", studentValues);

    for (const collection of STUDENT_MATCHING_RESPONSE_COLLECTIONS) {
      for (const studentVal of studentValues) {
        try {
          const filter = { student: { _eq: studentVal }, matching_software: { _eq: matchingSoftwareId } };
          const items = await client.request(
            readItems(collection as any, { fields, filter, limit: 1, sort: ["-id"] })
          ) as unknown as StudentMatchingResponse[];
          console.log("[getStudentMatchingResponse] collection:", collection, "studentVal:", studentVal, "filter:", JSON.stringify(filter), "items.length:", items.length);
          if (items.length > 0) {
            console.log("[getStudentMatchingResponse] FOUND response");
            return items[0];
          }
        } catch (err) {
          console.log("[getStudentMatchingResponse] collection:", collection, "studentVal:", studentVal, "ERROR:", err);
        }
      }
    }
    console.log("[getStudentMatchingResponse] No match found for any collection/filter");
    return null;
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
  const client = await getServerDirectusClient();
  const payload = {
    student: data.student,
    matching_software: data.matching_software,
    riasec_answers: data.riasec_answers,
    riasec: data.riasec,
    prerequisite_form_response: data.prerequisite_form_response || null,
    general_info_answers: data.general_info_answers ?? { work_preference: [], company_preference: [], options_preference: [] },
  };

  for (const collection of STUDENT_MATCHING_RESPONSE_COLLECTIONS) {
    try {
      console.log("[createStudentMatchingResponse] Trying collection:", collection, "payload student:", payload.student, "matching_software:", payload.matching_software);
      const result = (await client.request(createItem(collection as any, payload))) as unknown as StudentMatchingResponse;
      console.log("[createStudentMatchingResponse] Created in", collection, "result id:", result?.id);

      try {
        await computeAndStoreCompanyMatches(
          result.id,
          data.matching_software,
          data.riasec,
          data.prerequisite_form_response ?? undefined,
          data.general_info_answers ?? undefined
        );
      } catch (matchErr) {
        console.error("[createStudentMatchingResponse] Matching failed (non-fatal):", matchErr);
      }

      const refetched = await getStudentMatchingResponse(data.student, data.matching_software);
      console.log("[createStudentMatchingResponse] Refetch after create:", refetched ? "found" : "null");
      return refetched ?? result;
    } catch (err) {
      console.log("[createStudentMatchingResponse] collection:", collection, "ERROR:", err);
    }
  }
  console.error("[createStudentMatchingResponse] Failed for all collections");
  throw new Error("Failed to create student matching response");
}

/** Get a student's latest form response for a given form (for prerequisite check). Uses server client for student context.
 * Returns form_version_id so callers can detect if the response is for an older version.
 * Matches by data._student_id since form_responses may not have a student_id column. */
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
  const client = await getServerDirectusClient();
  const fields = [
    "id",
    "company",
    "ocia",
    "general_info_answers",
    "company.id",
    "company.category",
    "company.category.master_id",
    "company.category.master_id.id",
    "company.category.master_id.name",
  ];

  let formCategoriesByCompany = new Map<string, string[]>();
  if (categoryFormFields && categoryFormFields.length > 0) {
    const { getCompanyCategoriesFromFormResponses } = await import("./forms");
    formCategoriesByCompany = await getCompanyCategoriesFromFormResponses(categoryFormFields);
    console.log("[Matching] getCompanyMatchingResponsesForMatchingSoftware: form categories for", formCategoriesByCompany.size, "companies");
  }

  for (const collection of COMPANY_MATCHING_RESPONSE_COLLECTIONS) {
    try {
      const items = (await client.request(
        readItems(collection as any, {
          fields,
          filter: { matching_software: { _eq: matchingSoftwareId } },
          limit: -1,
        })
      )) as unknown as Array<{
        company: { id: string; category?: unknown[] };
        ocia: Record<OCIAType, number>;
        general_info_answers?: GeneralInfoAnswers;
      }>;

      const result = items
        .filter((item) => item.company?.id)
        .map((item) => {
          const companyId = typeof item.company === "string" ? item.company : item.company.id;
          const fromProfile = getCompanyCategoryNames(item.company as { category?: unknown });
          const fromForm = formCategoriesByCompany.get(companyId) ?? [];
          const categoryNames = fromForm.length > 0 ? fromForm : fromProfile;
          const hasOther = categoryNames.some((n) => n.toLowerCase() === "other");
          const generalInfo: GeneralInfoAnswers = item.general_info_answers ?? {
            work_preference: [],
            company_type: [],
            work_options: [],
          };
          return {
            companyId,
            ocia: item.ocia ?? { Clan: 0, Adhocracy: 0, Market: 0, Hierarchy: 0 },
            categoryNames,
            hasOther,
            generalInfo,
          };
        });
      console.log("[Matching] getCompanyMatchingResponsesForMatchingSoftware: fetched", result.length, "companies with OCIA | sample:", result.slice(0, 3).map((r) => ({ id: r.companyId, categories: r.categoryNames, hasOther: r.hasOther })));
      return result;
    } catch (err) {
      console.log("[Matching] getCompanyMatchingResponsesForMatchingSoftware: collection", collection, "error:", err);
    }
  }
  console.log("[Matching] getCompanyMatchingResponsesForMatchingSoftware: no data from any collection");
  return [];
}

const TARGET_MATCH_COUNT = 30;

const GENERAL_INFO_WEIGHT = 3; // Each overlapping general-info option reduces score by this much (lower score = better match)

/**
 * Compute company matches for a student and store in student_matching_response.companies.
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
  console.log("[Matching] computeAndStoreCompanyMatches: start | responseId:", studentResponseId, "| matchingSoftwareId:", matchingSoftwareId);

  const studentOcia = riasecToOcia(riasec);
  const studentStudyFields = await resolveStudyFieldForMatching(prerequisiteFormResponse ?? undefined);
  const studentGi: GeneralInfoAnswers = studentGeneralInfo ?? {
    work_preference: [],
    company_preference: [],
    options_preference: [],
  };

  console.log("[Matching] student RIASEC:", riasec, "| OCIA:", studentOcia, "| studyFields:", studentStudyFields.length ? studentStudyFields : "(none)");
  console.log("[Matching] prerequisite_form_response keys:", prerequisiteFormResponse ? Object.keys(prerequisiteFormResponse) : "null");

  const msConfig = await getMatchingSoftwareById(matchingSoftwareId);
  const categoryFormFields = (msConfig as { category_form_fields?: Array<{ formId: string; formVersionId: string; fieldName: string }> })?.category_form_fields;
  const companyResponses = await getCompanyMatchingResponsesForMatchingSoftware(matchingSoftwareId, categoryFormFields);

  if (companyResponses.length === 0) {
    console.log("[Matching] no company matching responses found - no companies have filled the software for this matching_software");
  }

  const eligible = companyResponses.filter((cr) =>
    studyFieldMatches(studentStudyFields, cr.categoryNames, cr.hasOther, cr.companyId)
  );

  console.log("[Matching] companies with OCIA:", companyResponses.length, "| eligible after study field filter:", eligible.length);

  if (eligible.length === 0) {
    console.log("[Matching] no eligible companies - storing empty matches");
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
  let bestScore = withScores[0]?.score ?? 0;
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

  console.log("[Matching] final matches:", matches.length, "| company IDs:", matches.slice(0, 5), matches.length > 5 ? "..." : "");

  await updateStudentMatchingResponseCompanies(studentResponseId, matches);
  console.log("[Matching] computeAndStoreCompanyMatches: done");
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

const JUNCTION_COLLECTIONS = ["student_matching_response_company", "Student_Matching_Response_Company"] as const;

const MATCHES_RECOMPUTE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Get when matches were last computed (from junction date_created). Returns null if unknown or no matches. */
export async function getMatchesLastComputedAt(responseId: string): Promise<Date | null> {
  const client = await getServerDirectusClient();
  const respFieldVariants = ["student_matching_response_id", "student_matching_response"] as const;

  for (const junction of JUNCTION_COLLECTIONS) {
    for (const respField of respFieldVariants) {
      try {
        const items = (await client.request(
          readItems(junction as any, {
            fields: ["date_created"],
            filter: { [respField]: { _eq: responseId } },
            limit: 1,
            sort: ["-date_created"],
          })
        )) as unknown as Array<{ date_created?: string }>;
        if (items.length > 0 && items[0].date_created) {
          const d = new Date(items[0].date_created);
          if (!isNaN(d.getTime())) return d;
        }
      } catch {
        // Junction may not have date_created; try next
      }
    }
  }
  return null;
}

/** Returns true if matches should be recomputed (stale or never computed). */
export async function shouldRecomputeMatches(responseId: string): Promise<boolean> {
  const lastAt = await getMatchesLastComputedAt(responseId);
  if (!lastAt) return true;
  return Date.now() - lastAt.getTime() > MATCHES_RECOMPUTE_INTERVAL_MS;
}

/** Fetch matched companies for a student response by reading the junction table directly. */
export async function getMatchedCompaniesForResponse(
  responseId: string
): Promise<MatchedCompany[]> {
  const client = await getServerDirectusClient();
  const companyFieldVariants = ["company_id", "company"] as const;
  const respFieldVariants = ["student_matching_response_id", "student_matching_response"] as const;

  for (const junction of JUNCTION_COLLECTIONS) {
    for (const respField of respFieldVariants) {
      for (const companyField of companyFieldVariants) {
        try {
          const items = (await client.request(
            readItems(junction as any, {
              fields: [companyField],
              filter: { [respField]: { _eq: responseId } },
              limit: -1,
            })
          )) as unknown as Array<Record<string, unknown>>;
          const ids = items
            .map((r) => {
              const v = r[companyField];
              return typeof v === "string" ? v : (v as { id?: string })?.id ?? "";
            })
            .filter(Boolean);
          if (ids.length > 0) {
            return getCompaniesByIds(ids);
          }
        } catch {
          // Try next variant
        }
      }
    }
  }
  return [];
}

export type MatchedCompany = { id: string; name?: string; logo?: string; page_on_platform?: boolean; status?: string; options?: unknown[] };

/** Fetch company id, name, logo, page_on_platform, status, options for given IDs (options needed for sub-option checks). */
export async function getCompaniesByIds(
  companyIds: string[]
): Promise<MatchedCompany[]> {
  if (companyIds.length === 0) return [];
  const client = await getServerDirectusClient();
  try {
    const items = (await client.request(
      readItems("company" as any, {
        fields: [
          "id",
          "name",
          "logo",
          "page_on_platform",
          "status",
          "options.career_event_option_id.*",
          "options.career_event_option_id.sub_options.*",
          "options.career_event_option_id.sub_options.career_sub_option_id.*",
          "options.sub_options.*",
          "options.sub_options.career_sub_option_id.*",
          "options.sub_options.career_sub_option.*",
        ],
        filter: { id: { _in: companyIds } },
        limit: companyIds.length,
      })
    )) as unknown as MatchedCompany[];
    return items;
  } catch (err) {
    console.error("[getCompaniesByIds] Error:", err);
    return [];
  }
}

const JUNCTION_FIELD_VARIANTS: { response: string; company: string }[] = [
  { response: "student_matching_response_id", company: "company_id" },
  { response: "student_matching_response", company: "company" },
];

async function updateStudentMatchingResponseCompanies(responseId: string, companyIds: string[]): Promise<void> {
  const client = await getServerDirectusClient();

  for (const junction of JUNCTION_COLLECTIONS) {
    for (const { response: respField, company: companyField } of JUNCTION_FIELD_VARIANTS) {
      try {
        await client.request(deleteItems(junction as any, { filter: { [respField]: { _eq: responseId } } }));
        for (const companyId of companyIds) {
          await client.request(createItem(junction as any, { [respField]: responseId, [companyField]: companyId }));
        }
        console.log("[Matching] updateStudentMatchingResponseCompanies: success via", junction, "fields:", respField, companyField, "| count:", companyIds.length);
        return;
      } catch (err) {
        console.log("[Matching] updateStudentMatchingResponseCompanies: failed", junction, respField, companyField, "|", err);
      }
    }
  }
  console.error("[Matching] updateStudentMatchingResponseCompanies: failed for all junction collections");
}
