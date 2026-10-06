import { NextRequest, NextResponse } from "next/server";
import { fetchEventPageBySlugAction } from "@/app/actions/events";
import { getCachedEventPage, setCachedEventPage } from "@/lib/event-page-cache";
import { sharedCacheHeaders } from "@/lib/http-cache";

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
        headers: sharedCacheHeaders(300, 600),
      });
    }

    // Fetch the event page from the Prisma-backed action.
    const page = await fetchEventPageBySlugAction(slug);

    if (!page) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404, headers: sharedCacheHeaders(60) }
      );
    }

    // Cache the result
    setCachedEventPage(slug, page);

    return NextResponse.json(page, {
      headers: sharedCacheHeaders(300, 600),
    });
  } catch (error) {
    console.error('[events API] Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}
