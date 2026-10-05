import { getUserFromCookies } from "@/lib/auth-server";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listEvents } from "@/lib/repos/event";

export default async function AdminCheckinsIndexPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const events = (await listEvents({ limit: 1000, sort: "-date" })) || [];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Event Check-ins" description="Select an event to view check-in data." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {events.map((event) => (
          <Link key={event.id} href={`/admin/checkins/${event.id}`} className="group">
            <Card className="gap-0 py-0 transition-colors group-hover:border-[#d4d4d8] group-hover:bg-surface-hover">
              <CardHeader className="py-4">
                <CardTitle className="text-[15px] font-medium">{event.name}</CardTitle>
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
