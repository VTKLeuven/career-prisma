import { notFound } from 'next/navigation'
import { fetchEventPageBySlugAction } from "@/app/actions/events"
import EventPageClient from './page-client'

export const revalidate = 300 // Revalidate every 5 minutes

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventName: string }>;
}) {
  const { eventName } = await params;

  // Fetch data on the server for faster initial load
  const page = await fetchEventPageBySlugAction(eventName);

  if (!page) {
    notFound();
  }

  // Pass data to client component
  return <EventPageClient initialPage={page} eventName={eventName} />;
}
