import { NextRequest, NextResponse } from "next/server";
import { loadCompanyPage } from "@/lib/company-page-data";
import { sharedCacheHeaders } from "@/lib/http-cache";

const CACHE_HEADERS = sharedCacheHeaders(300, 600);

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const data = await loadCompanyPage(slug);

    if (!data.company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404, headers: sharedCacheHeaders(60) }
      );
    }

    return NextResponse.json(data, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[company API] Error fetching company:", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}
