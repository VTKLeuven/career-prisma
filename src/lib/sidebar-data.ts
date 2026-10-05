import "server-only";

import type { AppUser, CareerEvent } from "@/lib/schema";
import { fetchEventsAction } from "@/app/actions/events";
import { fetchPendingApprovalRequestsAction } from "@/app/actions/companies";
import { getCompanyOrderingTabInfo } from "@/app/actions/ordering";
import { listScannedEventIdsForCompany } from "@/lib/repos/scans";
import { getCompanyEventIds } from "@/lib/utils/company-events";

/** What the back-office sidebar shows beyond the static navigation. */
export type SidebarData = {
  /** The company's events, for the per-event scan links. */
  companyEvents: Array<{ id: string; name: string }>;
  /** The company's booth when drink ordering is open, else null. */
  orderingBoothId: string | null;
  /** The company page image's file id, which the sidebar validates in the browser. */
  pageImageId: string | null;
  /** Pending rep approvals, for the admin badge (the sidebar keeps polling). */
  pendingApprovals: number;
};

/**
 * The sidebar's data, loaded with the (protected) layout. The sidebar used to
 * fetch all of this itself on mount, on every back-office page: the company
 * twice, every event, the ordering settings, and every scan the company ever
 * made just to read their event ids.
 */
export async function loadSidebarData(user: NonNullable<AppUser>): Promise<SidebarData> {
  const company = user.company && typeof user.company === "object" ? user.company : null;

  const [events, scannedEventIds, ordering, pending] = await Promise.all([
    company ? fetchEventsAction().then((rows) => (rows ?? []) as CareerEvent[]) : Promise.resolve([]),
    company ? listScannedEventIdsForCompany(company.id).catch(() => []) : Promise.resolve([]),
    company
      ? getCompanyOrderingTabInfo(company.id).catch(() => ({ enabled: false, boothId: null }))
      : Promise.resolve(null),
    user.admin ? fetchPendingApprovalRequestsAction().then((r) => r.length) : Promise.resolve(0),
  ]);

  // Events from purchased options, plus any the company has scans for (so
  // they show up even without an option).
  const eventIds = getCompanyEventIds(company);
  for (const id of scannedEventIds) eventIds.add(id);

  return {
    companyEvents: events.filter((e) => eventIds.has(e.id)).map((e) => ({ id: e.id, name: e.name })),
    orderingBoothId: ordering?.enabled && ordering.boothId ? ordering.boothId : null,
    pageImageId: company?.page_image ? String(company.page_image) : null,
    pendingApprovals: pending,
  };
}
