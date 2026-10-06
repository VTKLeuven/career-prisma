import { createTtlCache } from "@/lib/ttl-cache";

// In-memory cache for floorplan data (svg, booths) per event slug. Same TTL pattern as event pages.
const floorplanCache = createTtlCache("floorplan", 5 * 60 * 1000); // 5 minutes

export function getCachedFloorplan(eventSlug: string): unknown | null {
  return floorplanCache.get(eventSlug);
}

export function setCachedFloorplan(eventSlug: string, data: unknown): void {
  floorplanCache.set(eventSlug, data);
}

/** Call when floorplan data is updated (e.g. booth assignments) so the public page shows fresh data. */
export function invalidateFloorplanCache(): void {
  floorplanCache.clear();
}
