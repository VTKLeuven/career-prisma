import { getUserFromCookies } from "@/lib/auth-server";
import { fetchAcademicYearsAction } from "@/app/actions/cv-book";
import { fetchEventsAction, fetchEventSetupStatusesAction } from "@/app/actions/events";
import { AdminEventsClient, type AcademicYearOption } from "./events-client";
import type { EventsSectionData } from "./events-section";

/**
 * Opens on the current academic year with its events and their setup status
 * loaded here. The client page used to fetch the years, then the events, then
 * the statuses -- three server actions in a row -- before showing anything.
 */
export default async function AdminEventsPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const years = ((await fetchAcademicYearsAction()) ?? []) as AcademicYearOption[];
  const now = Date.now();
  const current =
    years.find(
      (year) => new Date(year.start_of_year).getTime() <= now && new Date(year.end_of_year).getTime() >= now
    ) ?? years[0];
  const initialYearId = current ? String(current.id) : "";

  let initialData: EventsSectionData | null = null;
  if (initialYearId) {
    const events = (await fetchEventsAction({ academicYearId: initialYearId })) ?? [];
    initialData = { events, statuses: await fetchEventSetupStatusesAction(events.map((event) => event.id)) };
  }

  return <AdminEventsClient years={years} initialYearId={initialYearId} initialData={initialData} />;
}
