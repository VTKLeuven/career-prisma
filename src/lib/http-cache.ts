/**
 * Cache headers for public, uncredentialed JSON routes.
 *
 * Browsers must revalidate; only shared caches (a CDN) may hold a copy. A
 * single `Cache-Control` carrying `s-maxage` + `stale-while-revalidate` and no
 * `max-age` also lets the *browser* reuse a stale body (heuristic freshness
 * plus the SWR window), so a visitor keeps seeing old data for minutes after
 * the server is correct. See docs/architecture.md, "Caching".
 */
export function sharedCacheHeaders(sMaxAge: number, staleWhileRevalidate?: number) {
  return {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "CDN-Cache-Control":
      `public, s-maxage=${sMaxAge}` +
      (staleWhileRevalidate ? `, stale-while-revalidate=${staleWhileRevalidate}` : ""),
  };
}
