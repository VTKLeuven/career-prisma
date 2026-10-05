import { NextRequest, NextResponse } from "next/server";
import { loadPublicFloorplan } from "@/lib/floorplan-data";
import { loadEventPage } from "@/lib/event-page-data";
import { isDevEnvironment } from "@/lib/dev-environment";
import { sharedCacheHeaders } from "@/lib/http-cache";

const CACHE_HEADERS = sharedCacheHeaders(300, 600);

/**
 * The public floorplan as JSON, for the floorplan app in vtk-floorplan-app/.
 * The web page renders the same data (loadPublicFloorplan) on the server.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  // Off means off: outside the dev environment the public floorplan does not
  // exist, so neither does the endpoint that feeds it. This check sits above the
  // cache lookup on purpose -- a warm cache would otherwise keep serving booth
  // data after the feature was hidden.
  if (!isDevEnvironment()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { slug } = await context.params;

    const page = await loadEventPage(slug);
    if (!page || !page.floorplan) {
      return NextResponse.json(
        { error: "Floorplan not found" },
        { status: 404, headers: sharedCacheHeaders(60) }
      );
    }

    const data = await loadPublicFloorplan(page, slug);
    if (!data) {
      return NextResponse.json(
        { error: "Floorplan data not available" },
        { status: 404, headers: sharedCacheHeaders(60) }
      );
    }

    return NextResponse.json(data, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[floorplan API] Error fetching floorplan:", error);
    return NextResponse.json(
      { error: "Failed to fetch floorplan" },
      { status: 500 }
    );
  }
}
