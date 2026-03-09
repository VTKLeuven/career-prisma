// In-memory cache for floorplan data (svg, booths) per event slug. Same TTL pattern as event pages.
const floorplanCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedFloorplan(eventSlug: string): unknown | null {
  const cached = floorplanCache.get(eventSlug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  return null;
}

export function setCachedFloorplan(eventSlug: string, data: unknown): void {
  floorplanCache.set(eventSlug, { data, timestamp: Date.now() });
}

/** Call when floorplan data is updated (e.g. booth assignments) so the public page shows fresh data. */
export function invalidateFloorplanCache(): void {
  floorplanCache.clear();
}
