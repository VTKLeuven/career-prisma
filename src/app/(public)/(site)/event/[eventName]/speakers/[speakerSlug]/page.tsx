import { notFound } from 'next/navigation'
import { fetchEventPageBySlugAction } from "@/app/actions/events"
import { getSpeakerSlug } from "@/lib/utils/slugify"
import { getSpeakersInSameTimeSlot } from '@/lib/utils/speakers'
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

  const allSpeakers = page.speakers ?? [];
  let speaker = allSpeakers.find((s) => getSpeakerSlug(s, allSpeakers) === speakerSlug);
  if (!speaker) {
    speaker = allSpeakers.find((s) => s.id === speakerSlug);
  }
  if (!speaker) {
    notFound();
  }

  const speakersInSlot = getSpeakersInSameTimeSlot(speaker, allSpeakers);

  return (
    <SpeakerPageClient
      page={page}
      speakers={speakersInSlot}
      eventName={eventName}
    />
  );
}
