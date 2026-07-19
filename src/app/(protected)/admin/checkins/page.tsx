import { getUserFromCookies } from "@/lib/auth-server";
import type { CareerEvent } from "@/lib/schema";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listEvents } from "@/lib/repos/event";

export default async function AdminCheckinsIndexPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const events = (await listEvents({ limit: 1000, sort: "-date" })) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Event Check-ins</h1>
      <p className="text-muted-foreground">
        Select an event to view check-in data.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <Link key={event.id} href={`/admin/checkins/${event.id}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>{event.name}</CardTitle>
                <CardDescription>
                  {event.date
                    ? new Date(event.date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "No date"}
                  {event.location ? ` — ${event.location}` : ""}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {events.length === 0 && (
          <p className="text-muted-foreground col-span-full">No events found.</p>
        )}
      </div>
    </div>
  );
}
