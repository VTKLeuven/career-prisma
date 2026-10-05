import "server-only";

import { fetchPublicEventsAction } from "@/app/actions/events";
import { fetchSalespersonsAction } from "@/app/actions/salespeople";
import { readHomepageCache, writeHomepageCache } from "@/lib/homepage-cache";

export type HomepageData = {
  events: Awaited<ReturnType<typeof fetchPublicEventsAction>>;
  salespersons: Awaited<ReturnType<typeof fetchSalespersonsAction>>;
};

/**
 * The homepage's events and team, through the homepage cache. The homepage
 * renders it on the server; /api/homepage serves it to the site header.
 *
 * Public and uncredentialed, so it must never carry draft editions --
 * fetchPublicEventsAction filters them.
 */
export async function loadHomepageData(): Promise<HomepageData> {
  const cached = readHomepageCache() as HomepageData | null;
  if (cached) return cached;

  const [events, salespersons] = await Promise.all([
    fetchPublicEventsAction(),
    fetchSalespersonsAction(),
  ]);
  const data = { events, salespersons };
  writeHomepageCache(data);
  return data;
}
