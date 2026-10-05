/**
 * Per-process TTL caches for the hot public read paths (event pages,
 * floorplans, company pages, the masters list).
 *
 * The stores live on `globalThis`, keyed by cache name. The reader (a page or
 * route handler) and the writers that invalidate it (server actions, admin
 * routes) can land in separate bundles, and dev hot reloads drop the module
 * registry -- a plain module-level Map would give each of them its own copy, so
 * an invalidation would clear a cache nobody reads. Same reasoning as
 * `homepage-cache.ts` and the client singleton in `lib/prisma.ts`.
 *
 * Per container and reset on deploy; see docs/architecture.md.
 */
type Entry = { data: unknown; timestamp: number };

const globalForTtlCaches = globalThis as unknown as {
  ttlCaches: Map<string, Map<string, Entry>> | undefined;
};

export function createTtlCache(name: string, ttlMs: number) {
  const registry = (globalForTtlCaches.ttlCaches ??= new Map());
  let store = registry.get(name);
  if (!store) {
    store = new Map<string, Entry>();
    registry.set(name, store);
  }
  const entries = store;

  return {
    get(key: string): unknown | null {
      const cached = entries.get(key);
      if (!cached) return null;
      if (Date.now() - cached.timestamp >= ttlMs) {
        entries.delete(key);
        return null;
      }
      return cached.data;
    },
    set(key: string, data: unknown): void {
      entries.set(key, { data, timestamp: Date.now() });
    },
    clear(): void {
      entries.clear();
    },
  };
}
