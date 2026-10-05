import { fetchEventsAction } from "@/app/actions/events";
import { getUserFromCookies } from "@/lib/auth-server";
import { listCompanyScans } from "@/lib/repos/scans";
import { AllScansClient, type AttendantScan } from "./all-scans-client";

/**
 * Loaded on the server: the page used to fetch the events with a server action
 * and the scans from /api/scans after hydrating, behind a spinner.
 */
export default async function AllScansPage() {
  // The (protected) layout already turned away visitors who are not signed in.
  const user = await getUserFromCookies();
  const companyId = typeof user?.company === "string" ? user.company : user?.company?.id;

  const [events, scans] = await Promise.all([
    fetchEventsAction().catch(() => null),
    companyId ? listCompanyScans(companyId) : Promise.resolve([]),
  ]);

  // The client's AttendantScan type is the shape /api/scans has always sent
  // (this same list); it is looser about ids and nulls than the repo's type.
  return <AllScansClient initialScans={scans as unknown as AttendantScan[]} events={events ?? []} />;
}
