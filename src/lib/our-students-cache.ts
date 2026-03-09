// In-memory cache for our-students page (masters list). Same TTL pattern as event pages.
let cachedMasters: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedOurStudents(): unknown | null {
  if (cachedMasters && Date.now() - cachedMasters.timestamp < CACHE_TTL) return cachedMasters.data;
  return null;
}

export function setCachedOurStudents(data: unknown): void {
  cachedMasters = { data, timestamp: Date.now() };
}

/** Call when masters data is updated so the page shows fresh data. */
export function invalidateOurStudentsCache(): void {
  cachedMasters = null;
}
