import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch all companies for an event page.
 * ?eventId=xxx - uses event ID directly (from page.event.id)
 * Queries junction table directly with limit=-1 to bypass Directus default 100.
 */
const JUNCTION_NAMES = [
  "career_event_page_company",
  "career_event_page_companies",
  "career_event_page_company_id",
];
const PAGE_FK_FIELDS = ["career_event_page_id", "career_event_page"];

export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get("eventId");
    if (!eventId) {
      return NextResponse.json({ companies: [] }, { status: 200 });
    }

    const baseUrl = (process.env.DIRECTUS_URL || "http://localhost:8055").replace(/\/$/, "");
    const token = process.env.DIRECTUS_SERVER_TOKEN;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // 1. Get event page id
    const pageRes = await fetch(
      `${baseUrl}/items/career_event_page?filter[event][_eq]=${encodeURIComponent(eventId)}&fields=id&limit=1`,
      { headers }
    );
    if (!pageRes.ok) throw new Error("Failed to fetch event page");
    const pageJson = (await pageRes.json()) as { data?: Array<{ id: string }> };
    const pageId = pageJson.data?.[0]?.id;
    if (!pageId) return NextResponse.json({ companies: [] }, { status: 200 });

    // 2. Try junction table directly with limit=-1 (bypasses deep/100 default)
    for (const jn of JUNCTION_NAMES) {
      for (const fkField of PAGE_FK_FIELDS) {
        const q = new URLSearchParams({
          [`filter[${fkField}][_eq]`]: pageId,
          limit: "-1",
          fields: "company_id.*",
        });
        const res = await fetch(`${baseUrl}/items/${jn}?${q}`, { headers });
        if (!res.ok) continue;

        const json = (await res.json()) as { data?: Array<{ company_id: unknown }> };
        const rows = json.data ?? [];
        const companies = rows.map((r) => r.company_id).filter(Boolean);
        if (companies.length > 0) {
          return NextResponse.json({ companies }, {
            headers: { "Cache-Control": "public, s-maxage=60" },
          });
        }
      }
    }

    // 3. Fallback: parent query with deep (may be limited to 100)
    const q = new URLSearchParams({
      "filter[event][_eq]": eventId,
      limit: "1",
      fields: "companies.company_id.*",
      "deep[companies][limit]": "10000",
    });
    const res = await fetch(`${baseUrl}/items/career_event_page?${q}`, { headers });
    if (!res.ok) throw new Error(`Directus error: ${res.status}`);

    const json = (await res.json()) as { data?: Array<{ companies?: Array<{ company_id: unknown }> }> };
    const companies = (json.data?.[0]?.companies ?? [])
      .map((item) => item.company_id)
      .filter(Boolean);

    return NextResponse.json({ companies }, {
      headers: { "Cache-Control": "public, s-maxage=60" },
    });
  } catch (error) {
    console.error("[events/companies] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies", companies: [] },
      { status: 500 }
    );
  }
}
