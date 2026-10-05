import { createTtlCache } from "@/lib/ttl-cache";

// In-memory cache for our-students page (masters list). Same TTL pattern as event pages.
const ourStudentsCache = createTtlCache("our-students", 5 * 60 * 1000); // 5 minutes
const KEY = "masters";

export function getCachedOurStudents(): unknown | null {
  return ourStudentsCache.get(KEY);
}

export function setCachedOurStudents(data: unknown): void {
  ourStudentsCache.set(KEY, data);
}

/** Call when masters data is updated so the page shows fresh data. */
export function invalidateOurStudentsCache(): void {
  ourStudentsCache.clear();
}
