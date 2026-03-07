// In-memory cache for company pages. Same TTL pattern as event pages.
const companyPageCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedCompanyPage(slug: string): unknown | null {
  const cached = companyPageCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  return null;
}

export function setCachedCompanyPage(slug: string, data: unknown): void {
  companyPageCache.set(slug, { data, timestamp: Date.now() });
}

/** Call when company page data is updated so the public page shows fresh data. */
export function invalidateCompanyPageCache(): void {
  companyPageCache.clear();
}
