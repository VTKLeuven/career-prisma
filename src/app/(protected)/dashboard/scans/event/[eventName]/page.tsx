import { fetchEventsAction } from "@/app/actions/events";
import { getUserFromCookies } from "@/lib/auth-server";
import { listCompanyScans } from "@/lib/repos/scans";
import { slugifyEventName } from "@/lib/utils/slugify";
import { EventScansClient, type AttendantScan } from "./event-scans-client";

/**
 * The company's scans at one event, loaded on the server (the page used to
 * look up the event with a server action, then fetch /api/scans).
 */
export default async function EventScansPage({ params }: { params: Promise<{ eventName: string }> }) {
  const { eventName: rawEventName } = await params;
  const eventName = rawEventName.includes("%") ? decodeURIComponent(rawEventName) : rawEventName;

  // The (protected) layout already turned away visitors who are not signed in.
  const user = await getUserFromCookies();
  const companyId = typeof user?.company === "string" ? user.company : user?.company?.id;

  let scans: AttendantScan[] = [];
  let title = eventName;
  if (companyId && eventName) {
    const events = (await fetchEventsAction().catch(() => null)) ?? [];
    const slug = slugifyEventName(eventName);
    const event = events.find((e) => slugifyEventName(e.name) === slug);
    // The URL carries the slug ("vtk-jobfair"); head the page with the real name.
    if (event?.name) title = event.name;
    // Older links name a form rather than an event.
    // Typed as the client has always received it from /api/scans (see all/page.tsx).
    scans = (await listCompanyScans(companyId, event ? { eventId: event.id } : { eventName })) as unknown as AttendantScan[];
  }

  return <EventScansClient eventName={title} initialScans={scans} />;
}
