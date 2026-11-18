import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, CalendarDays, Clock, MapPin } from "lucide-react";
import { getStudentFromCookies } from "@/lib/auth-student";
import { listStudentEventRegistrations, type StudentEventRegistration } from "@/lib/repos/forms";
import { eventZoneToday } from "@/lib/utils/events";
import { slugifyEventName } from "@/lib/utils/slugify";
import { formPath } from "@/lib/site-path";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My registrations",
  robots: { index: false },
};

const EVENT_TIME_ZONE = process.env.EVENT_TIMEZONE || "Europe/Brussels";

/** "Thursday 11 March 2027". The date is a wall-clock date, so it is read as UTC to stay that day. */
function formatEventDate(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** "09:45 – 17:00"; hours are stored as Belgian wall-clock times. */
function formatEventHours(start: string | null, end: string | null): string | null {
  const s = start?.slice(0, 5);
  const e = end?.slice(0, 5);
  if (s && e) return `${s} – ${e}`;
  return s ? `from ${s}` : null;
}

/** "12 November 2026 at 14:03", in Belgian time (the server runs on UTC). */
function formatSubmittedAt(iso: string | null): string {
  if (!iso) return "an unknown date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "an unknown date";
  const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: EVENT_TIME_ZONE }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: EVENT_TIME_ZONE }).format(d);
  return `${day} at ${time}`;
}

/**
 * The public event page, when there is one to open: only published events
 * have a public page. The name slug picks this edition rather than the
 * newest one of its series.
 */
function eventHref(event: NonNullable<StudentEventRegistration["event"]>): string | null {
  if (event.status !== "published" || !event.has_page) return null;
  const slug = slugifyEventName(event.name) || event.series_key;
  return slug ? `/event/${encodeURIComponent(slug)}` : null;
}

type Timing = "upcoming" | "today" | "past" | "unknown";

function timingOf(registration: StudentEventRegistration, today: string): Timing {
  const date = registration.event?.date;
  if (!date) return "unknown";
  if (date < today) return "past";
  if (date === today) return "today";
  return "upcoming";
}

/**
 * /student/registrations: every event the signed-in student registered for,
 * newest registration first, past events included. Registrations are form
 * responses on an event registration form; listStudentEventRegistrations()
 * explains how they are found without a foreign key.
 */
export default async function StudentRegistrationsPage() {
  const student = await getStudentFromCookies();
  if (!student) {
    redirect(`/student-login?redirectTo=${encodeURIComponent("/student/registrations")}`);
  }

  const registrations = await listStudentEventRegistrations(student.id);
  const today = eventZoneToday();

  return (
    <div className="container max-w-5xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-vtk-blue" />
            My registrations
          </CardTitle>
          <CardDescription>
            Every event you registered for, most recent registration first. While the registration form is
            still open, you can view and change your answers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {registrations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">No registrations yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                You haven&apos;t registered for any events yet. Once you do, your registration will show up
                here.
              </p>
              <Button asChild className="mt-6 rounded-full bg-vtk-blue text-white hover:bg-vtk-blueDark">
                <Link href="/#all-events">Browse all events</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {registrations.map((r) => (
                <RegistrationCard key={r.id} registration={r} timing={timingOf(r, today)} />
              ))}
            </ul>
          )}
          {registrations.length > 0 && (
            <Button asChild variant="outline">
              <Link href="/#all-events">Browse all events</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RegistrationCard({
  registration: r,
  timing,
}: {
  registration: StudentEventRegistration;
  timing: Timing;
}) {
  const event = r.event;
  const title = event?.name || r.form.name;
  const href = event ? eventHref(event) : null;
  const hours = event ? formatEventHours(event.start_hour, event.end_hour) : null;
  const formLink = r.form.slug && r.form.viewable ? formPath(r.form.slug) : null;

  return (
    <li className="rounded-xl border border-border/60 bg-card p-5 transition-colors hover:border-vtk-blue/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold leading-tight text-foreground wrap-anywhere">
              {href ? (
                <Link href={href} className="hover:text-vtk-blue hover:underline underline-offset-4">
                  {title}
                </Link>
              ) : (
                title
              )}
            </h2>
            {timing === "past" && <Badge variant="muted">Past</Badge>}
            {timing === "today" && <Badge variant="warning">Today</Badge>}
            {timing === "upcoming" && <Badge variant="success">Registered</Badge>}
          </div>

          <dl className="space-y-1 text-sm text-muted-foreground">
            {event?.date ? (
              <div className="flex items-center gap-2">
                <dt className="sr-only">Date</dt>
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                <dd>
                  {formatEventDate(event.date)}
                  {hours && <span> · {hours}</span>}
                </dd>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <dt className="sr-only">Date</dt>
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                <dd>Date to be announced</dd>
              </div>
            )}
            {event?.location && (
              <div className="flex items-center gap-2">
                <dt className="sr-only">Location</dt>
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                <dd className="wrap-anywhere">{event.location}</dd>
              </div>
            )}
            <div className="flex items-center gap-2">
              <dt className="sr-only">Registered on</dt>
              <Clock className="h-4 w-4 shrink-0" aria-hidden />
              <dd>Registered on {formatSubmittedAt(r.submitted_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {formLink && r.form.editable ? (
            <Button asChild size="sm" className="rounded-full bg-vtk-blue text-white hover:bg-vtk-blueDark">
              <Link href={formLink}>View or edit registration</Link>
            </Button>
          ) : formLink ? (
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href={formLink}>View registration</Link>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">The registration form is closed.</span>
          )}
          {href && (
            <Button asChild size="sm" variant="ghost" className="rounded-full">
              <Link href={href}>Go to event page</Link>
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
