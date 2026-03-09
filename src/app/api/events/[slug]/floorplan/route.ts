import { NextRequest, NextResponse } from "next/server";
import { fetchEventPageBySlugAction } from "@/app/actions/events";
import { fetchFloorplanAction } from "@/app/actions/features";
import { getCachedEventPage, setCachedEventPage } from "@/lib/event-page-cache";
import { getCachedFloorplan, setCachedFloorplan } from "@/lib/floorplan-cache";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  "CDN-Cache-Control": "public, s-maxage=300",
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params;
    const { slug } = params;

    // Check floorplan cache first
    const cachedFloorplan = getCachedFloorplan(slug);
    if (cachedFloorplan) {
      return NextResponse.json(cachedFloorplan, { headers: CACHE_HEADERS });
    }

    // Get event page (use event cache)
    let page = getCachedEventPage(slug) as Awaited<ReturnType<typeof fetchEventPageBySlugAction>> | null;
    if (!page) {
      page = await fetchEventPageBySlugAction(slug);
      if (page) setCachedEventPage(slug, page);
    }

    if (!page || !page.floorplan) {
      return NextResponse.json(
        { error: "Floorplan not found" },
        { status: 404, headers: { "Cache-Control": "public, s-maxage=60" } }
      );
    }

    const data = await fetchFloorplanAction(page);
    if (!data) {
      return NextResponse.json(
        { error: "Floorplan data not available" },
        { status: 404, headers: { "Cache-Control": "public, s-maxage=60" } }
      );
    }

    setCachedFloorplan(slug, data);
    return NextResponse.json(data, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[floorplan API] Error fetching floorplan:", error);
    return NextResponse.json(
      { error: "Failed to fetch floorplan" },
      { status: 500 }
    );
  }
}
