import { notFound } from 'next/navigation'
import { fetchEventPageBySlugAction } from "@/app/actions/events"
import { getSpeakerSlug } from "@/lib/utils/slugify"
import SpeakerPageClient from './page-client'

export const revalidate = 30

export default async function SpeakerPage({
  params,
}: {
  params: Promise<{ eventName: string; speakerSlug: string }>;
}) {
  const { eventName, speakerSlug } = await params;

  const page = await fetchEventPageBySlugAction(eventName);

  if (!page) {
    notFound();
  }

  const speakers = page.speakers ?? [];
  let speaker = speakers.find((s) => getSpeakerSlug(s, speakers) === speakerSlug);
  if (!speaker) {
    speaker = speakers.find((s) => s.id === speakerSlug);
  }
  if (!speaker) {
    notFound();
  }

  return (
    <SpeakerPageClient
      page={page}
      speaker={speaker}
      eventName={eventName}
    />
  );
}
