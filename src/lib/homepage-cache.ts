// lib/homepage-cache.ts
/**
 * In-memory cache behind `/api/homepage`, which the homepage, the site header
 * and the event pages all share.
 *
 * It lives here rather than inside the route so that writes which change what
 * the homepage shows can drop it. Without that, an admin edit stays invisible
 * for up to the TTL and looks like the save silently failed -- which is exactly
 * how it looked when clearing a team member's `profile_link`.
 *
 * Per-process, so each server instance expires on its own. That is fine for a
 * payload that is already public and a couple of minutes stale by design.
 */
const TTL_MS = 2 * 60 * 1000;

// The reader (a route handler) and the writers (server actions) can land in
// separate bundles, and dev hot reloads drop the module registry entirely. A
// plain module-level variable would give them a copy each, so invalidating from
// an action would clear a cache the route never reads. Same reasoning as the
// client singleton in lib/prisma.ts.
const globalForHomepage = globalThis as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  homepageCache: { data: any; timestamp: number } | null | undefined;
};

/** Cached payload, or null when empty or expired. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function readHomepageCache(): any | null {
  const cache = globalForHomepage.homepageCache;
  if (!cache) return null;
  if (Date.now() - cache.timestamp >= TTL_MS) {
    globalForHomepage.homepageCache = null;
    return null;
  }
  return cache.data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function writeHomepageCache(data: any): void {
  globalForHomepage.homepageCache = { data, timestamp: Date.now() };
}

/** Called by writes that change the homepage (team members, events). */
export function invalidateHomepageCache(): void {
  globalForHomepage.homepageCache = null;
}
