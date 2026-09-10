import { NextResponse } from "next/server";
import { fetchPublicEventsAction } from "@/app/actions/events";
import { fetchSalespersonsAction } from "@/app/actions/salespeople";
import {
  readHomepageCache,
  writeHomepageCache,
} from "@/lib/homepage-cache";

/**
 * Browsers must revalidate; shared caches may serve a cached copy. Splitting the
 * two is the point of CDN-Cache-Control: a single `Cache-Control` carrying
 * `s-maxage` + `stale-while-revalidate` and no `max-age` also lets the *browser*
 * reuse a stale body (heuristic freshness plus the SWR window), so a visitor
 * kept seeing an old team card for minutes after it changed.
 */
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "CDN-Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
};

export async function GET() {
  try {
    const cached = readHomepageCache();
    if (cached) {
      return NextResponse.json(cached, { headers: CACHE_HEADERS });
    }

    // Fetch both in parallel for faster loading
    // This endpoint is public and uncredentialed -- it feeds the homepage and
    // the site header -- so it must never carry draft editions.
    const [events, salespersons] = await Promise.all([
      fetchPublicEventsAction(),
      fetchSalespersonsAction(),
    ]);

    const data = { events, salespersons };
    writeHomepageCache(data);

    return NextResponse.json(data, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('[homepage API] Error fetching homepage data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage data' },
      { status: 500 }
    );
  }
}
