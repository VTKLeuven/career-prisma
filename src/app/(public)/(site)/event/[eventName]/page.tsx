import { notFound } from 'next/navigation'
import { fetchEventPageBySlugAction } from "@/app/actions/events"
import { getCachedEventPage, setCachedEventPage } from "@/lib/event-page-cache"
import EventPageClient from './page-client'

export const revalidate = 30 // Revalidate every 30s so header_buttons updates show soon

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventName: string }>;
}) {
  const { eventName } = await params;

  // Use same in-memory cache as /api/events/[slug] to avoid Directus on every request under load
  let page = getCachedEventPage(eventName) as Awaited<ReturnType<typeof fetchEventPageBySlugAction>> | null;
  if (!page) {
    page = await fetchEventPageBySlugAction(eventName);
    if (page) {
      setCachedEventPage(eventName, page);
    }
  }

  if (!page) {
    notFound();
  }

  // Pass data to client component
  return <EventPageClient initialPage={page} eventName={eventName} />;
}
