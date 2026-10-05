import { getUserFromCookies } from "@/lib/auth-server";
import Link from "next/link";
import CheckinsClient from "./client";
import { getEventName } from "@/lib/repos/event";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminCheckinEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const { eventId } = await params;

  const eventName = (await getEventName(eventId)) || "Event";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        title={eventName}
        description="Check-ins for this event"
        actions={
          <Link
            href="/admin/checkins"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            &larr; All events
          </Link>
        }
      />
      <CheckinsClient eventId={eventId} />
    </div>
  );
}
