// lib/repos/cv-book-screening.ts
"use server";

import { readItems, createItem, updateItem } from "@directus/sdk";
import { getAdminDirectusClient } from "@/lib/directus";
import { getUserFromCookies } from "@/lib/auth-server";

const COLLECTION = "CV_Book_screening";
const DIRECTUS_URL = (process.env.DIRECTUS_URL || "http://localhost:8055").replace(/\/?$/, "/");

export type ScreeningStatus = "pending" | "approved" | "rejected";

/** Normalize status from Directus (JSON column may return "\"rejected\"" or parsed value) */
function normalizeStatus(raw: unknown): ScreeningStatus {
  if (raw === "approved" || raw === "rejected" || raw === "pending") return raw;
  const str = typeof raw === "string" ? raw.trim() : String(raw ?? "");
  if (str === "approved" || str === "rejected" || str === "pending") return str;
  try {
    const parsed = JSON.parse(str);
    if (parsed === "approved" || parsed === "rejected" || parsed === "pending") return parsed;
  } catch {
    // not JSON
  }
  if (/^"?rejected"?$/i.test(str.replace(/\\/g, ""))) return "rejected";
  if (/^"?approved"?$/i.test(str.replace(/\\/g, ""))) return "approved";
  if (/^"?pending"?$/i.test(str.replace(/\\/g, ""))) return "pending";
  if (raw && typeof raw === "object" && "value" in raw) {
    const v = (raw as { value: unknown }).value;
    if (v === "approved" || v === "rejected" || v === "pending") return v;
  }
  return "pending";
}

export type CVBookScreeningRecord = {
  id: string;
  cv_book: string;
  form_response: string;
  status: ScreeningStatus;
  study_override?: string | null;
  screened_at?: string;
  screened_by?: string | null;
};

async function getClient() {
  const client = getAdminDirectusClient();
  if (!client) throw new Error("Admin client not available");
  return client;
}

/** Extract array from Directus response (SDK may return { data: [] } or array) */
function toArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && "data" in raw && Array.isArray((raw as { data: unknown }).data)) {
    return (raw as { data: T[] }).data;
  }
  return [];
}

/** Get all screening records for a CV Book - use REST API for consistent parsing */
export async function listScreeningForCVBook(cvBookId: string): Promise<CVBookScreeningRecord[]> {
  try {
    const token = process.env.DIRECTUS_SERVER_TOKEN;
    if (!token) throw new Error("Admin client not available");
    const url = new URL(`${DIRECTUS_URL}items/${COLLECTION}`);
    url.searchParams.set("filter[cv_book][_eq]", cvBookId);
    url.searchParams.set("fields", "id,cv_book,form_response,status,study_override,screened_at,screened_by");
    url.searchParams.set("depth", "0"); // prevent relation expansion - form_response stays as UUID
    url.searchParams.set("limit", "-1"); // get all records (default is 100)
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error("[listScreeningForCVBook] Fetch failed:", res.status, await res.text());
      return [];
    }
    const json = (await res.json()) as { data?: unknown[] };
    const items = Array.isArray(json?.data) ? json.data : [];
    return items as CVBookScreeningRecord[];
  } catch (error) {
    console.error("[listScreeningForCVBook] Error:", error);
    return [];
  }
}

/** Get screening record for a form response in a CV Book */
export async function getScreeningRecord(
  cvBookId: string,
  formResponseId: string
): Promise<CVBookScreeningRecord | null> {
  try {
    const client = await getClient();
    const raw = await client.request(
      readItems(COLLECTION as any, {
        fields: ["*"],
        filter: {
          cv_book: { _eq: cvBookId },
          form_response: { _eq: formResponseId },
        },
        limit: 1,
      })
    );
    const arr = toArray<CVBookScreeningRecord>(raw);
    return arr[0] ?? null;
  } catch (error) {
    console.error("[getScreeningRecord] Error:", error);
    return null;
  }
}

/** Extract form_response ID - try all possible Directus relation formats */
function getFormResponseId(r: Record<string, unknown>): string | null {
  const candidates = [
    r.form_response,
    r.form_response_id,
    (r as Record<string, unknown>).form_responses_id,
  ];
  for (const fr of candidates) {
    if (typeof fr === "string" && fr.length > 0) return fr;
    if (typeof fr === "number" && !Number.isNaN(fr)) return String(fr);
    if (fr && typeof fr === "object" && fr !== null) {
      const obj = fr as Record<string, unknown>;
      if (typeof obj.id === "string") return obj.id;
      if (typeof obj.id === "number") return String(obj.id);
      if (typeof obj.form_responses_id === "string") return obj.form_responses_id;
    }
  }
  return null;
}

/** Get screening map (form_response_id -> record). Used by getCVBookStudentData. */
export async function getScreeningMap(
  cvBookId: string
): Promise<Map<string, CVBookScreeningRecord>> {
  const records = await listScreeningForCVBook(cvBookId);
  const map = new Map<string, CVBookScreeningRecord>();
  for (const r of records) {
    const frId = getFormResponseId(r as Record<string, unknown>);
    if (!frId) continue;
    map.set(frId, { ...r, status: normalizeStatus(r.status) });
  }
  return map;
}

/** Approve or reject a CV */
export async function setScreeningStatus(
  cvBookId: string,
  formResponseId: string,
  status: ScreeningStatus,
  studyOverride?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getClient();
    const user = await getUserFromCookies();
    const screenedBy = user?.id ?? null;
    const existing = await getScreeningRecord(cvBookId, formResponseId);
    const screenedAt = new Date().toISOString();
    if (existing) {
      const updatePayload: Record<string, unknown> = {
        status: JSON.stringify(status),
        screened_at: screenedAt,
        screened_by: screenedBy,
      };
      if (studyOverride !== undefined && studyOverride !== null) {
        updatePayload.study_override = studyOverride;
      } else {
        updatePayload.study_override = null;
      }
      await client.request(updateItem(COLLECTION as any, existing.id, updatePayload));
    } else {
      // Build create payload. When Directus Dropdown uses JSON type, status must be
      // sent as valid JSON (e.g. "\"approved\"" not "approved") for PostgreSQL.
      const createPayload: Record<string, unknown> = {
        cv_book: cvBookId,
        form_response: formResponseId,
        status: JSON.stringify(status),
        screened_at: screenedAt,
        screened_by: screenedBy,
      };
      if (studyOverride !== undefined && studyOverride !== null && studyOverride !== "") {
        createPayload.study_override = studyOverride;
      }
      const token = process.env.DIRECTUS_SERVER_TOKEN;
      if (!token) throw new Error("Admin client not available");
      const res = await fetch(`${DIRECTUS_URL}items/${COLLECTION}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(createPayload),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Directus create failed: ${res.status} ${errBody}`);
      }
    }
    return { success: true };
  } catch (error) {
    console.error("[setScreeningStatus] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update screening",
    };
  }
}

/** Delete a CV from the CV Book (reject) */
export async function rejectCV(
  cvBookId: string,
  formResponseId: string
): Promise<{ success: boolean; error?: string }> {
  return setScreeningStatus(cvBookId, formResponseId, "rejected");
}

/** Approve a CV */
export async function approveCV(
  cvBookId: string,
  formResponseId: string,
  studyOverride?: string | null
): Promise<{ success: boolean; error?: string }> {
  return setScreeningStatus(cvBookId, formResponseId, "approved", studyOverride);
}

/** Update study override for a CV */
export async function updateStudyOverride(
  cvBookId: string,
  formResponseId: string,
  studyOverride: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getClient();
    const existing = await getScreeningRecord(cvBookId, formResponseId);
    const user = await getUserFromCookies();
    const screenedBy = user?.id ?? null;
    if (existing) {
      await client.request(
        updateItem(COLLECTION as any, existing.id, {
          study_override: studyOverride,
          screened_at: new Date().toISOString(),
          screened_by: screenedBy,
        })
      );
    } else {
      const createPayload: Record<string, unknown> = {
        cv_book: cvBookId,
        form_response: formResponseId,
        status: JSON.stringify("pending"),
        study_override: studyOverride,
        screened_at: new Date().toISOString(),
        screened_by: screenedBy,
      };
      await client.request(createItem(COLLECTION as any, createPayload));
    }
    return { success: true };
  } catch (error) {
    console.error("[updateStudyOverride] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update study",
    };
  }
}

/** Mark CV Book as screening complete and ready for companies */
export async function markCVBookScreeningComplete(
  cvBookId: string,
  complete: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getClient();
    await client.request(
      updateItem("CV_Book" as any, cvBookId, {
        screening_complete: complete,
      })
    );
    return { success: true };
  } catch (error) {
    console.error("[markCVBookScreeningComplete] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update CV Book",
    };
  }
}
