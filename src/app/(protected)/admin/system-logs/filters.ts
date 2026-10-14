import type { SystemLogLevel } from "@/lib/repos/system-logs";

export type Filters = { source?: string; level?: SystemLogLevel; event?: string };

/** Builds a filter link that keeps the other active filters. */
export function filterHref(current: Filters, change: Partial<Filters>): string {
  const next = { ...current, ...change };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/admin/system-logs?${query}` : "/admin/system-logs";
}
