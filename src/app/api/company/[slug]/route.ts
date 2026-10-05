import { NextRequest, NextResponse } from "next/server";
import { fetchCompanyBySlugWithSubOptionsAction, fetchSpeakersForCompanyAction } from "@/app/actions/companies";
import { getCachedCompanyPage, setCachedCompanyPage } from "@/lib/company-page-cache";
import { sharedCacheHeaders } from "@/lib/http-cache";

const CACHE_HEADERS = sharedCacheHeaders(300, 600);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params;
    const { slug } = params;

    // Check cache first
    const cached = getCachedCompanyPage(slug);
    if (cached) {
      return NextResponse.json(cached, { headers: CACHE_HEADERS });
    }

    // Fetch from PostgreSQL through the company action.
    const result = await fetchCompanyBySlugWithSubOptionsAction(slug);

    if (!result.company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404, headers: sharedCacheHeaders(60) }
      );
    }

    // Fetch speakers for this company
    const speakers = await fetchSpeakersForCompanyAction(result.company.id);
    const response = { ...result, speakers };

    // Cache the result
    setCachedCompanyPage(slug, response);

    return NextResponse.json(response, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[company API] Error fetching company:", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}
