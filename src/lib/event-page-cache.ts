// In-memory cache for event pages. Invalidated when header_buttons or other event page data is updated.
const eventPageCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedEventPage(slug: string): unknown | null {
  const cached = eventPageCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  return null;
}

export function setCachedEventPage(slug: string, data: unknown): void {
  eventPageCache.set(slug, { data, timestamp: Date.now() });
}

/** Call when event page data is updated (e.g. header_buttons) so the public page shows fresh data. */
export function invalidateEventPageCache(): void {
  eventPageCache.clear();
}
