import { NextRequest, NextResponse } from "next/server";
import { fetchEventPageBySlugAction } from "@/app/actions/events";
import { getCachedEventPage, setCachedEventPage } from "@/lib/event-page-cache";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params;
    const { slug } = params;

    // Check cache first
    const cached = getCachedEventPage(slug);
    if (cached) {
      return NextResponse.json(cached, {
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
    setCachedEventPage(slug, page);

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

