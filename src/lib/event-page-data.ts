import "server-only";

import { fetchEventPageBySlugAction } from "@/app/actions/events";
import { getCachedEventPage, setCachedEventPage } from "@/lib/event-page-cache";

export type PublicEventPage = NonNullable<Awaited<ReturnType<typeof fetchEventPageBySlugAction>>>;

/**
 * The public event page for a slug, through the event-page cache. The event
 * page, its sub-pages, its speaker pages and /api/events/<slug> all read it
 * this way, so one visitor warms the cache for the others.
 */
export async function loadEventPage(slug: string): Promise<PublicEventPage | null> {
  const cached = getCachedEventPage(slug) as PublicEventPage | null;
  if (cached) return cached;
  const page = await fetchEventPageBySlugAction(slug);
  if (page) setCachedEventPage(slug, page);
  return page;
}
