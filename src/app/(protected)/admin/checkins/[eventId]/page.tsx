import { getUserFromCookies } from "@/lib/auth-server";
import { getAdminDirectusClient } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import type { CareerEvent } from "@/lib/schema";
import Link from "next/link";
import CheckinsClient from "./client";

export default async function AdminCheckinEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const { eventId } = await params;

  let eventName = "Event";
  const client = getAdminDirectusClient();
  if (client) {
    const events = (await client.request(
      readItems("career_event" as any, {
        fields: ["id", "name"],
        filter: { id: { _eq: eventId } },
        limit: 1,
      })
    )) as unknown as CareerEvent[];
    if (events.length > 0) eventName = events[0].name;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/checkins"
          className="text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          &larr; All events
        </Link>
      </div>
      <h1 className="text-3xl font-bold">Check-ins: {eventName}</h1>
      <CheckinsClient eventId={eventId} />
    </div>
  );
}
