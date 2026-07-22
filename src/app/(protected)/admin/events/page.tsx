"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FilePenLine,
  Loader2,
  Mic2,
} from "lucide-react";
import { EventsSection } from "../companies-events/client";
import { fetchAcademicYearsAction } from "@/app/actions/cv-book";
import { copyAnnualCatalogAction } from "@/app/actions/annual-catalog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/providers/UserProvider";

type AcademicYearOption = {
  id: string;
  name: string;
  start_of_year: string;
  end_of_year: string;
};

const WORKFLOW = [
  {
    title: "1. Event series",
    description: "The recurring event identity, such as VTK Jobfair. It keeps one stable public URL.",
  },
  {
    title: "2. Annual edition",
    description: "The date, hours and capacity for one academic year. Manage these below.",
  },
  {
    title: "3. Event page",
    description: "The public content, companies, speakers and timetable for that annual edition.",
  },
];

export default function AdminEventsPage() {
  const { user } = useUser();
  const [years, setYears] = React.useState<AcademicYearOption[]>([]);
  const [selectedYearId, setSelectedYearId] = React.useState("");
  const [sourceYearId, setSourceYearId] = React.useState("");
  const [copying, setCopying] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = React.useState(0);

  React.useEffect(() => {
    fetchAcademicYearsAction().then((items) => {
      const available = items ?? [];
      setYears(available);
      const now = Date.now();
      const current = available.find((year) =>
        new Date(year.start_of_year).getTime() <= now
        && new Date(year.end_of_year).getTime() >= now
      ) ?? available[0];
      if (current) setSelectedYearId(String(current.id));
    });
  }, []);

  if (!user?.admin) return <p>NO ACCESS</p>;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="text-muted-foreground">
          Manage recurring event series, their annual editions and everything shown on the public event page.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">How an event is structured</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {WORKFLOW.map((step, index) => (
            <div key={step.title} className="relative rounded-lg border bg-muted/20 p-4">
              <h3 className="font-medium">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              {index < WORKFLOW.length - 1 ? (
                <ArrowRight className="absolute -right-5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground lg:block" />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="space-y-2">
            <Label>Academic year to manage</Label>
            <div className="flex gap-2">
              <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {years.map((year) => <SelectItem key={year.id} value={String(year.id)}>{year.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" asChild><Link href="/admin/academic-years">Manage years</Link></Button>
            </div>
          </div>
          <div className="space-y-2 xl:ml-auto">
            <Label>Create this year from an existing year</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={sourceYearId} onValueChange={setSourceYearId}>
                <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Source year" /></SelectTrigger>
                <SelectContent>
                  {years.filter((year) => String(year.id) !== selectedYearId).map((year) => (
                    <SelectItem key={year.id} value={String(year.id)}>{year.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                disabled={!selectedYearId || !sourceYearId || copying}
                onClick={async () => {
                  if (!confirm("Create missing event editions, pages, timetables and career options from this year? Company sales are never copied.")) return;
                  setCopying(true);
                  setMessage(null);
                  const result = await copyAnnualCatalogAction(sourceYearId, selectedYearId);
                  setCopying(false);
                  if (!result.success) return setMessage(result.error ?? "Copy failed");
                  setMessage(`${result.data?.eventsCreated ?? 0} event editions and ${result.data?.optionsCreated ?? 0} options created. Their event pages are drafts until you publish them.`);
                  setRefreshVersion((value) => value + 1);
                }}
              >
                {copying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                Create annual editions
              </Button>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Use this for recurring events. It preserves the event series and public URL, copies the previous page and timetable as drafts, and never copies company purchases.
        </p>
        {message ? <p className="mt-3 text-sm">{message}</p> : null}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Button variant="outline" className="h-auto justify-start p-4" asChild>
          <Link href={`/admin/event-pages?year=${selectedYearId}`}><FilePenLine className="mr-3 h-5 w-5" /><span className="text-left"><strong className="block">Pages & timetables</strong><small className="text-muted-foreground">Public content per edition</small></span></Link>
        </Button>
        <Button variant="outline" className="h-auto justify-start p-4" asChild>
          <Link href="/admin/speakers"><Mic2 className="mr-3 h-5 w-5" /><span className="text-left"><strong className="block">Speakers</strong><small className="text-muted-foreground">Speakers shown on event pages</small></span></Link>
        </Button>
        <Button variant="outline" className="h-auto justify-start p-4" asChild>
          <Link href="/admin/checkins"><ClipboardCheck className="mr-3 h-5 w-5" /><span className="text-left"><strong className="block">Check-ins</strong><small className="text-muted-foreground">Attendance per event</small></span></Link>
        </Button>
        <Button variant="outline" className="h-auto justify-start p-4" asChild>
          <Link href="/admin/career-options"><CheckCircle2 className="mr-3 h-5 w-5" /><span className="text-left"><strong className="block">Options & sales</strong><small className="text-muted-foreground">Packages linked to editions</small></span></Link>
        </Button>
      </div>

      {selectedYearId ? (
        <EventsSection key={`${selectedYearId}-${refreshVersion}`} academicYearId={selectedYearId} />
      ) : (
        <div className="grid h-32 place-items-center rounded-xl border text-muted-foreground">
          <CalendarDays className="mr-2 inline h-5 w-5" /> Select an academic year to manage its events.
        </div>
      )}
    </div>
  );
}
