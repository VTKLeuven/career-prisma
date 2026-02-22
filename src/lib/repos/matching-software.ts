// lib/repos/matching-software.ts
"use server";

import { readItems, createItem, updateItem, deleteItems } from "@directus/sdk";
import { getAuthedDirectusOrThrow, getServerDirectusClient } from "@/lib/directus";
import type { MatchingSoftware, StudentMatchingResponse, CompanyMatchingResponse, RIASECType, OCIAType } from "@/lib/schema";
import { countGeneralInfoOverlap, type GeneralInfoAnswers } from "@/lib/matching-general-info";

const RIASEC_TYPES: RIASECType[] = ["R", "I", "A", "S", "E", "C"];

/** RIASEC → OCIA mapping: Clan=S+A, Adhocracy=A+E, Market=R+E, Hierarchy=C+I */
function riasecToOcia(riasec: Record<RIASECType, number>): Record<OCIAType, number> {
  return {
    Clan: (riasec.S ?? 0) + (riasec.A ?? 0),
    Adhocracy: (riasec.A ?? 0) + (riasec.E ?? 0),
    Market: (riasec.R ?? 0) + (riasec.E ?? 0),
    Hierarchy: (riasec.C ?? 0) + (riasec.I ?? 0),
  };
}

/** Sum of absolute differences between OCIA profiles (lower = more similar) */
function ociaSimilarityScore(studentOcia: Record<OCIAType, number>, companyOcia: Record<OCIAType, number>): number {
  const types: OCIAType[] = ["Clan", "Adhocracy", "Market", "Hierarchy"];
  return types.reduce((sum, t) => sum + Math.abs((studentOcia[t] ?? 0) - (companyOcia[t] ?? 0)), 0);
}

const STUDY_FIELD_KEYS = ["study_field", "study", "master", "program"];

function extractStudyField(data: Record<string, unknown> | null | undefined): string | null {
  if (!data || typeof data !== "object") {
    console.log("[Matching] extractStudyField: no data or not object");
    return null;
  }
  for (const key of STUDY_FIELD_KEYS) {
    const val = data[key];
    if (val != null && typeof val === "string" && val.trim()) {
      console.log("[Matching] extractStudyField: found", key, "=", val.trim());
      return val.trim();
    }
    if (val != null && typeof val === "object" && "name" in (val as object)) {
      const name = String((val as { name: string }).name).trim();
      console.log("[Matching] extractStudyField: found", key, ".name =", name);
      return name;
    }
  }
  console.log("[Matching] extractStudyField: no study field in keys", STUDY_FIELD_KEYS, "| data keys:", Object.keys(data));
  return null;
}

function getCompanyCategoryNames(company: { category?: unknown }): string[] {
  const raw = company.category;
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "object" && item && "master_id" in item) {
        const mid = (item as { master_id: unknown }).master_id;
        if (typeof mid === "object" && mid && "name" in mid) return String((mid as { name: string }).name).trim();
      }
      if (typeof item === "object" && item && "name" in item) return String((item as { name: string }).name).trim();
      return null;
    })
    .filter((n): n is string => Boolean(n));
}

function studyFieldMatches(
  studentStudyField: string | null,
  companyCategoryNames: string[],
  companyHasOther: boolean,
  companyId?: string
): boolean {
  if (!studentStudyField) {
    if (companyId) console.log("[Matching] studyFieldMatches: company", companyId, "NO MATCH (no student study field)");
    return false;
  }
  const normalized = studentStudyField.toLowerCase();
  const directMatch = companyCategoryNames.some(
    (name) => name.toLowerCase().includes(normalized) || normalized.includes(name.toLowerCase())
  );
  if (directMatch) {
    if (companyId) console.log("[Matching] studyFieldMatches: company", companyId, "MATCH (direct, categories:", companyCategoryNames.join(", "), ")");
    return true;
  }
  if (companyHasOther) {
    if (companyId) console.log("[Matching] studyFieldMatches: company", companyId, "MATCH (Other fallback, student field not in", companyCategoryNames.join(", "), ")");
    return true;
  }
  if (companyId) console.log("[Matching] studyFieldMatches: company", companyId, "NO MATCH (student:", studentStudyField, "| company categories:", companyCategoryNames.join(", "), "| hasOther:", companyHasOther, ")");
  return false;
}

const MATCHING_SOFTWARE_COLLECTIONS = ["Matching_Software", "matching_software"] as const;
const STUDENT_MATCHING_RESPONSE_COLLECTIONS = ["student_matching_response", "Student_Matching_Response"] as const;
const COMPANY_MATCHING_RESPONSE_COLLECTIONS = ["Company_Matching_Response", "company_matching_response"] as const;

async function listFromCollection(
  client: Awaited<ReturnType<typeof getAuthedDirectusOrThrow>>,
  collection: string,
  filter: Record<string, unknown>
) {
  return client.request(
    readItems(collection, {
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

/** Get active matching software for an event - uses first active one for that event (year may vary).
 * Uses server client (same as student login) so it works for logged-in students. */
export async function getActiveMatchingSoftwareForEvent(eventId: string): Promise<MatchingSoftware | null> {
  try {
    const client = await getServerDirectusClient();
    let lastError: unknown;
    for (const collection of MATCHING_SOFTWARE_COLLECTIONS) {
      try {
        const items = (await client.request(
          readItems(collection, {
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
          readItems(collection, {
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

/** Batch get company IDs that have completed matching software (ocia_answers with 13+ keys). */
export async function getCompanyMatchingResponseCompletedIds(
  matchingSoftwareId: string,
  companyIds: string[]
): Promise<Set<string>> {
  const result = new Set<string>();
  if (companyIds.length === 0) return result;
  try {
    const client = await getServerDirectusClient();
    const fields = ["company", "ocia_answers"];
    const filter = {
      _and: [
        { matching_software: { _eq: matchingSoftwareId } },
        { company: { _in: companyIds } },
      ],
    };
    for (const collection of COMPANY_MATCHING_RESPONSE_COLLECTIONS) {
      try {
        const items = (await client.request(
          readItems(collection, { fields, filter, limit: -1 })
        )) as unknown as CompanyMatchingResponse[];
        for (const item of items) {
          const companyId = typeof item.company === "string" ? item.company : (item.company as { id: string })?.id;
          if (companyId && item.ocia_answers && Object.keys(item.ocia_answers).length >= 13) {
            result.add(companyId);
          }
        }
        return result;
      } catch {
        // Try next collection
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
          readItems(collection, { fields, filter, limit: 1, sort: ["-id"] })
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
          updateItem(collection, existing.id, payload)
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
        const result = (await client.request(createItem(collection, payload))) as unknown as CompanyMatchingResponse;
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
      const result = (await client.request(createItem(collection, payload))) as unknown as MatchingSoftware;
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
        updateItem(collection, id, payload)
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
            readItems(collection, { fields, filter, limit: 1, sort: ["-id"] })
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
      const result = (await client.request(createItem(collection, payload))) as unknown as StudentMatchingResponse;
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
  matchingSoftwareId: string
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

  for (const collection of COMPANY_MATCHING_RESPONSE_COLLECTIONS) {
    try {
      const items = (await client.request(
        readItems(collection, {
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
          const categoryNames = getCompanyCategoryNames(item.company as { category?: unknown });
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

const GENERAL_INFO_WEIGHT = 10; // Each overlapping general-info option reduces score by this much (lower score = better match)

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
  const studentStudyField = extractStudyField(prerequisiteFormResponse ?? undefined);
  const studentGi: GeneralInfoAnswers = studentGeneralInfo ?? {
    work_preference: [],
    company_preference: [],
    options_preference: [],
  };

  console.log("[Matching] student RIASEC:", riasec, "| OCIA:", studentOcia, "| studyField:", studentStudyField ?? "(none)");
  console.log("[Matching] prerequisite_form_response keys:", prerequisiteFormResponse ? Object.keys(prerequisiteFormResponse) : "null");

  const companyResponses = await getCompanyMatchingResponsesForMatchingSoftware(matchingSoftwareId);

  if (companyResponses.length === 0) {
    console.log("[Matching] no company matching responses found - no companies have filled the software for this matching_software");
  }

  const eligible = companyResponses.filter((cr) =>
    studyFieldMatches(studentStudyField, cr.categoryNames, cr.hasOther, cr.companyId)
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
    const combinedScore = ociaScore - generalInfoOverlap * GENERAL_INFO_WEIGHT;
    return {
      companyId: cr.companyId,
      score: combinedScore,
    };
  });

  withScores.sort((a, b) => a.score - b.score);

  let margin = 0;
  let bestScore = withScores[0]?.score ?? 0;
  let matches: string[] = [];

  while (matches.length < TARGET_MATCH_COUNT && margin <= 200) {
    const threshold = bestScore + margin;
    matches = withScores.filter((m) => m.score <= threshold).map((m) => m.companyId);
    if (matches.length >= TARGET_MATCH_COUNT) {
      matches = matches.slice(0, TARGET_MATCH_COUNT);
      break;
    }
    margin += 5;
  }

  if (matches.length > TARGET_MATCH_COUNT) {
    matches = matches.slice(0, TARGET_MATCH_COUNT);
  }

  console.log("[Matching] final matches:", matches.length, "| company IDs:", matches.slice(0, 5), matches.length > 5 ? "..." : "");

  await updateStudentMatchingResponseCompanies(studentResponseId, matches);
  console.log("[Matching] computeAndStoreCompanyMatches: done");
  return matches;
}

const JUNCTION_COLLECTIONS = ["student_matching_response_company", "Student_Matching_Response_Company"] as const;

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
            readItems(junction, {
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
      readItems("company", {
        fields: [
          "id",
          "name",
          "logo",
          "page_on_platform",
          "status",
          "options.career_event_option_id.*",
          "options.sub_options.*",
          "options.sub_options.career_sub_option_id.*",
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
        await client.request(deleteItems(junction, { filter: { [respField]: { _eq: responseId } } }));
        for (const companyId of companyIds) {
          await client.request(createItem(junction, { [respField]: responseId, [companyField]: companyId }));
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
