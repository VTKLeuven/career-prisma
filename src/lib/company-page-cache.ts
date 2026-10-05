import { createTtlCache } from "@/lib/ttl-cache";

// In-memory cache for company pages. Same TTL pattern as event pages.
const companyPageCache = createTtlCache("company-page", 5 * 60 * 1000); // 5 minutes

export function getCachedCompanyPage(slug: string): unknown | null {
  return companyPageCache.get(slug);
}

export function setCachedCompanyPage(slug: string, data: unknown): void {
  companyPageCache.set(slug, data);
}

/** Call when company page data is updated so the public page shows fresh data. */
export function invalidateCompanyPageCache(): void {
  companyPageCache.clear();
}
