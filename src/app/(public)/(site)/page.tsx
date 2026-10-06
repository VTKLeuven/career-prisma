import { loadHomepageData } from "@/lib/homepage-data"
import type { CareerEvent, UserSummary } from "@/lib/schema"
import { HomePageClient } from "./home-client"

// Rendered per request from the in-process homepage cache, which admin edits
// invalidate (lib/homepage-cache.ts). A statically prerendered page would keep
// showing the events and team of the last build.
export const dynamic = "force-dynamic"

export default async function HomePage() {
  const { events, salespersons } = await loadHomepageData()
  return (
    <HomePageClient
      events={(events ?? []) as CareerEvent[]}
      team={(salespersons ?? []) as UserSummary[]}
    />
  )
}
