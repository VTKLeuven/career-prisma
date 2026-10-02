import { getUserFromCookies } from "@/lib/auth-server";
import { listEventPagesAdmin, listFloorplansBasic } from "@/lib/repos/event-page";
import { listEvents } from "@/lib/repos/event";
import { listCompaniesBasic } from "@/lib/repos/company";
import { listSpeakers } from "@/lib/repos/speakers";
import EventPagesClient from "./client";
import { getCurrentAcademicYear, listAcademicYearsForAdmin } from "@/lib/repos/academic-year";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminEventPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; event?: string }>;
}) {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;
  const query = await searchParams;

  const [pages, events, floorplans, companies, speakers, academicYears, currentYear] = await Promise.all([
    listEventPagesAdmin(),
    listEvents({ limit: 500, sort: "-date", includeHistory: true }),
    listFloorplansBasic(),
    listCompaniesBasic(),
    listSpeakers({ limit: 1000 }),
    listAcademicYearsForAdmin(),
    getCurrentAcademicYear(),
  ]);

  const eventOptions = (events ?? []).map((e) => ({
    value: String(e.id),
    label: e.name ?? "(untitled)",
    academicYearId: String(e.academic_year_id ?? e.academic_year?.id ?? ""),
  }));
  const floorplanOptions = floorplans.map((f) => ({
    value: String(f.id),
    label: [f.name, f.year].filter(Boolean).join(" ") || `Floorplan #${f.id}`,
  }));
  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name ?? "(unnamed)" }));
  const speakerOptions = speakers.map((s) => ({
    value: String(s.id),
    label:
      [s.representative?.first_name, s.representative?.last_name].filter(Boolean).join(" ") ||
      `Speaker #${s.id}`,
  }));
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        title="Event Pages & Timetables"
        description="Every row belongs to one annual event edition. Its public content, companies, speakers and timetable are edited together here."
        actions={
          <>
            <Button variant="outline" asChild><Link href="/admin/events"><ArrowLeft className="h-4 w-4" /> Event editions</Link></Button>
            <Button variant="outline" asChild><Link href="/admin/speakers"><Mic2 className="h-4 w-4" /> Speakers</Link></Button>
            <Button variant="outline" asChild><Link href="/admin/checkins"><ClipboardCheck className="h-4 w-4" /> Check-ins</Link></Button>
          </>
        }
      />
      <EventPagesClient
        initialPages={pages}
        eventOptions={eventOptions}
        floorplanOptions={floorplanOptions}
        companyOptions={companyOptions}
        speakerOptions={speakerOptions}
        academicYears={academicYears.map((year) => ({
          value: String(year.id),
          label: year.name,
          endOfYear: year.end_of_year,
        }))}
        currentAcademicYearId={currentYear?.id ? String(currentYear.id) : ""}
        initialAcademicYearId={query.year}
        focusedEventId={query.event}
      />
    </div>
  );
}
