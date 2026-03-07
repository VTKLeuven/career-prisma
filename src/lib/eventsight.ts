// lib/eventsight.ts - EventSight subscription integration (static config for a single event)

// Set to true to log the request instead of sending it
const EVENTSIGHT_DEBUG = true;

const EVENTSIGHT_API_URL = "https://api.eventsight.eu/api/subscription";

const EVENTSIGHT_CONFIG = {
  apiKey: "1EC2619F-C3DB-459C-95BF-3BBAC97212C2",
  client: "EVENTSIGHT_vtk",
  externalEventId: "4F244D88-34EF-4739-A9AA-9E9C86FDCCB1",
  internalEventId: "4a1b38c1-83f4-418e-b4c3-9e1ec680f832",
};

/**
 * Maps full university display names (from universities.ts / form responses)
 * to the short codes expected by the EventSight API.
 */
const UNIVERSITY_SHORT_CODE_MAP: Record<string, string> = {
  "KU Leuven (KUL)": "kul",
  "Universiteit Gent (UGent)": "ugent",
  "Universiteit Antwerpen (UAntwerpen)": "uantwerpen",
  "Vrije Universiteit Brussel (VUB)": "vub",
  "Université Libre de Bruxelles (ULB)": "ulb",
  "Universiteit Hasselt (UHasselt)": "uhasselt",
  "UCLouvain (Université catholique de Louvain)": "ucl",
  "Technische Universiteit Delft (TU Delft)": "tudelft",
  "Other": "other",
};

const VALID_SHORT_CODES = new Set([
  "kul", "ugent", "uantwerpen", "vub", "ulb", "uhasselt", "ucl", "tudelft", "other",
]);

function resolveUniversityCode(raw: unknown): string {
  if (!raw || typeof raw !== "string") return "other";

  const lower = raw.trim().toLowerCase();
  if (VALID_SHORT_CODES.has(lower)) return lower;

  if (UNIVERSITY_SHORT_CODE_MAP[raw]) return UNIVERSITY_SHORT_CODE_MAP[raw];

  for (const [displayName, code] of Object.entries(UNIVERSITY_SHORT_CODE_MAP)) {
    if (displayName.toLowerCase().includes(lower) || lower.includes(code)) {
      return code;
    }
  }

  return "other";
}

/**
 * Sends a subscription to EventSight when a student registers for the configured event.
 * Returns silently if the form's event_id doesn't match the configured event.
 */
export async function sendEventSightSubscription(
  eventId: string | undefined,
  context: {
    formData: Record<string, unknown>;
    attendantUuid?: string;
    student?: { first_name?: string | null; last_name?: string | null; university?: string } | null;
  }
) {
  if (!eventId || String(eventId) !== EVENTSIGHT_CONFIG.internalEventId) {
    return;
  }

  const { formData, attendantUuid, student } = context;

  const firstName =
    (formData.firstname as string) ||
    (formData.first_name as string) ||
    student?.first_name ||
    "";
  const lastName =
    (formData.lastname as string) ||
    (formData.last_name as string) ||
    student?.last_name ||
    "";

  const rawUniversity =
    formData.university || formData._student_university || student?.university || "";
  const universityCode = resolveUniversityCode(rawUniversity);

  const formDomain =
    process.env.NEXT_PUBLIC_FORM_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const attendantLink = attendantUuid
    ? `${formDomain}/attendant/${attendantUuid}`
    : "";

  const body = {
    loc: EVENTSIGHT_CONFIG.externalEventId,
    RSVP_status: "Yes",
    barcode: attendantUuid?.replaceAll("-", "") || "",
    companyName: "",
    firstName,
    lastName,
    email: "",
    field1: attendantLink,
    field2: "",
    field3: "",
    field4: "",
    field5: "",
    field6: "",
    field7: "",
    field8: "",
    field9: universityCode,
  };

  const headers = {
    "Content-Type": "application/json",
    "X-EventSight-apikey": EVENTSIGHT_CONFIG.apiKey,
    "X-EventSight-client": EVENTSIGHT_CONFIG.client,
      "X-EventSight-event": EVENTSIGHT_CONFIG.externalEventId,
  };

  if (EVENTSIGHT_DEBUG) {
    console.log("[EventSight DEBUG] Would send request:");
    console.log("[EventSight DEBUG] URL:", EVENTSIGHT_API_URL);
    console.log("[EventSight DEBUG] Headers:", JSON.stringify(headers, null, 2));
    console.log("[EventSight DEBUG] Body:", JSON.stringify(body, null, 2));
    return;
  }

  const response = await fetch(EVENTSIGHT_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `EventSight API returned ${response.status}: ${text}`
    );
  }

  console.log("[EventSight] Subscription sent successfully for attendant:", attendantUuid);
}
