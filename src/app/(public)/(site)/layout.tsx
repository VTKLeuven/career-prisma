import { loadHomepageData } from "@/lib/homepage-data";
import type { HeaderEvent } from "@/components/site/header-events";
import { SiteShell } from "./site-shell";

/**
 * Loads the header's events menu (published events, from the homepage cache)
 * once per request, so the header no longer fetches it after hydrating. No
 * user data here: who is signed in stays a client-side check, so the public
 * pages carry nothing personal.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { events } = await loadHomepageData().catch(() => ({ events: [] as HeaderEvent[] }));
  // Only what the menu shows: this goes into every public page.
  const headerEvents: HeaderEvent[] = (events ?? []).map(({ id, name, date, location, href }) => ({
    id,
    name,
    date,
    location,
    href,
  }));
  return <SiteShell headerEvents={headerEvents}>{children}</SiteShell>;
}
