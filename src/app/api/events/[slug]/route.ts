import { NextRequest, NextResponse } from "next/server";
import { fetchEventPageBySlugAction } from "@/app/actions/events";

// Cache for event pages (in-memory, could be replaced with Redis in production)
const eventCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params;
    const { slug } = params;

    // Check cache first
    const cached = eventCache.get(slug);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5 min CDN, 10 min stale
          'CDN-Cache-Control': 'public, s-maxage=300',
        },
      });
    }

    // Fetch from Directus
    const page = await fetchEventPageBySlugAction(slug);

    if (!page) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404, headers: { 'Cache-Control': 'public, s-maxage=60' } }
      );
    }

    // Cache the result
    eventCache.set(slug, { data: page, timestamp: Date.now() });

    return NextResponse.json(page, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, s-maxage=300',
      },
    });
  } catch (error) {
    console.error('[events API] Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

