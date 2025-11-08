import { NextResponse } from "next/server";
import { fetchEventsAction } from "@/app/actions/events";
import { fetchSalespersonsAction } from "@/app/actions/salespeople";

// Cache for homepage data
const homepageCache = { data: null as any, timestamp: 0 };
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export async function GET() {
  try {
    // Check cache
    if (homepageCache.data && Date.now() - homepageCache.timestamp < CACHE_TTL) {
      return NextResponse.json(homepageCache.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
          'CDN-Cache-Control': 'public, s-maxage=120',
        },
      });
    }

    // Fetch both in parallel for faster loading
    const [events, salespersons] = await Promise.all([
      fetchEventsAction(),
      fetchSalespersonsAction(),
    ]);

    const data = { events, salespersons };
    
    // Cache the result
    homepageCache.data = data;
    homepageCache.timestamp = Date.now();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        'CDN-Cache-Control': 'public, s-maxage=120',
      },
    });
  } catch (error) {
    console.error('[homepage API] Error fetching homepage data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage data' },
      { status: 500 }
    );
  }
}

