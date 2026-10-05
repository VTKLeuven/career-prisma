import { createTtlCache } from "@/lib/ttl-cache";

// In-memory cache for event pages. Invalidated when header_buttons or other event page data is updated.
const eventPageCache = createTtlCache("event-page", 5 * 60 * 1000); // 5 minutes

export function getCachedEventPage(slug: string): unknown | null {
  return eventPageCache.get(slug);
}

export function setCachedEventPage(slug: string, data: unknown): void {
  eventPageCache.set(slug, data);
}

/** Call when event page data is updated (e.g. header_buttons) so the public page shows fresh data. */
export function invalidateEventPageCache(): void {
  eventPageCache.clear();
}
