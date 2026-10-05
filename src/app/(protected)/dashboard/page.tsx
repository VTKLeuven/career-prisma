import { getUserFromCookies } from "@/lib/auth-server";
import type { CareerEvent, Company } from "@/lib/schema";
import { fetchEventsAction } from "@/app/actions/events";
import { fetchCompanyByIdAction } from "@/app/actions/companies";
import {
  fetchCompanyFormsForEventAction,
  checkCompanyFormCompletionBatchWithCompulsoryAction,
} from "@/app/actions/forms";
import {
  getMatchingSoftwareForEventAction,
  getCompanyMatchingResponseAction,
} from "@/app/actions/matching-software";
import { hasSchedulesForEventAction } from "@/app/actions/schedules";
import { getCompanyOrderingTabInfo } from "@/lib/company-ordering";
import { getCompanySubOptionAnyStatus } from "@/lib/utils/company-access";
import { getUpcomingEventsWithFallback } from "@/lib/utils/events";
import { getCompanyEvents, getCompanyOptionIds } from "@/lib/utils/company-events";
import { DashboardHome, type ManagedEvent } from "./dashboard-client";

/**
 * The company dashboard home: the company's events with their forms,
 * matching software, schedules and ordering, and the upcoming events.
 *
 * Loaded here, in parallel, on the server. The page used to be a client
 * component that fired ten-odd server actions on mount -- and Next runs a
 * client's server actions one at a time, so they queued.
 */
export default async function DashboardPage() {
  // The (protected) layout already turned away visitors who are not signed in.
  const user = await getUserFromCookies();

  const [events, company] = await Promise.all([
    fetchEventsAction().then((rows) => (rows ?? []) as CareerEvent[]),
    user?.company?.id ? fetchCompanyByIdAction(user.company.id, false, true) : Promise.resolve(null),
  ]);

  const [managedEvents, ordering] = await Promise.all([
    company ? Promise.all(getCompanyEvents(events, company).map((event) => loadManagedEvent(event, company))) : Promise.resolve([]),
    company ? getCompanyOrderingTabInfo(company.id) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <DashboardHome
        managedEvents={managedEvents}
        upcomingEvents={getUpcomingEventsWithFallback(events, 4)}
        orderingEnabled={!!ordering?.enabled && !!ordering.boothId}
      />
    </div>
  );
}

async function loadManagedEvent(event: CareerEvent, company: Company): Promise<ManagedEvent> {
  const [forms, matchingSoftware, hasSchedules] = await Promise.all([
    fetchCompanyFormsForEventAction(event.id, getCompanyOptionIds(company)).catch((error) => {
      console.error("[dashboard] Error fetching company forms:", error);
      return [];
    }),
    getMatchingSoftwareForEventAction(event.id).catch(() => null),
    hasSchedulesForEventAction(event.id).catch(() => false),
  ]);

  // Completed: compulsory forms need the exact version, others any version.
  const formsForCheck = forms.map((f) => ({
    formId: f.id,
    formVersionId: f.activeVersion.id,
    versionNumber: f.activeVersion.version_number,
    isCompulsory: (f.metadata as { is_compulsory?: boolean })?.is_compulsory === true,
  }));
  const [completed, matchingResponse] = await Promise.all([
    formsForCheck.length > 0
      ? checkCompanyFormCompletionBatchWithCompulsoryAction([company.id], formsForCheck)
      : Promise.resolve(new Map<string, Set<string>>()),
    matchingSoftware ? getCompanyMatchingResponseAction(company.id, matchingSoftware.id).catch(() => null) : Promise.resolve(null),
  ]);

  return {
    event,
    // Only what the card shows -- not each form's full schema.
    forms: forms.map((f) => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      metadata: { deadline: (f.metadata as { deadline?: string } | undefined)?.deadline },
    })),
    completedFormIds: [...(completed.get(company.id) ?? [])],
    hasMatchingSoftware: !!matchingSoftware,
    matchingSoftwareCompleted:
      !!matchingResponse?.ocia_answers && Object.keys(matchingResponse.ocia_answers).length >= 13,
    hasSchedules,
    // AnyStatus catches sub-options that may be inactive or in a different structure.
    hasStudentSchedulesAccess: getCompanySubOptionAnyStatus(company, "Student Schedules") !== null,
  };
}
