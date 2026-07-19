import { getUserFromCookies } from "@/lib/auth-server";
import Link from "next/link";
import CheckinsClient from "./client";
import prisma from "@/lib/prisma";

export default async function AdminCheckinEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const { eventId } = await params;

  const event = await prisma.careerEvent.findUnique({
    where: { id: eventId },
    select: { name: true },
  });
  const eventName = event?.name || "Event";

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
