import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { fetchEventPageBySlugAction } from "@/app/actions/events"
import { getCachedEventPage, setCachedEventPage } from "@/lib/event-page-cache"
import { slugifyEventName } from "@/lib/utils/slugify"
import { isDevEnvironment } from "@/lib/dev-environment"
import EventPageClient from './page-client'

export const revalidate = 30 // Revalidate every 30s so header_buttons updates show soon

async function loadEventPage(slug: string) {
  let page = getCachedEventPage(slug) as Awaited<ReturnType<typeof fetchEventPageBySlugAction>> | null;
  if (!page) {
    page = await fetchEventPageBySlugAction(slug);
    if (page) setCachedEventPage(slug, page);
  }
  return page;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventName: string }>;
}): Promise<Metadata> {
  const { eventName } = await params;
  const page = await loadEventPage(eventName);
  if (!page?.event) return {};
  const canonicalSlug = page.event.series_key || slugifyEventName(page.event.name);
  const description = String(page.tagline || page.event.description || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    title: page.event.name,
    description: description || undefined,
    alternates: { canonical: `/event/${canonicalSlug}` },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventName: string }>;
}) {
  const { eventName } = await params;

  const page = await loadEventPage(eventName);

  if (!page) {
    notFound();
  }

  // Pass data to client component. The floorplan flag is resolved here because
  // isDevEnvironment() is server-only; the client cannot read it itself.
  return (
    <EventPageClient
      initialPage={page}
      eventName={eventName}
      floorplanEnabled={isDevEnvironment()}
    />
  );
}
