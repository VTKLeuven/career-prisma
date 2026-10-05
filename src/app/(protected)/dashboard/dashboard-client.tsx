"use client";

import * as React from "react";
import Image from 'next/image'
import Link from "next/link";
import { motion } from 'framer-motion'
import { Calendar, FileText, CheckCircle2, Wine } from "lucide-react";
import { getFileUrl } from "@/components/Images";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CareerEvent } from "@/lib/schema";
import { isDuringEvent, type EventWithStatus } from '@/lib/utils/events';
import { formatDateTimeBE } from '@/lib/date-utils';

/** One of the company's events, with everything its card shows (loaded by ./page.tsx). */
export type ManagedEvent = {
  event: CareerEvent;
  forms: Array<{ id: string; name: string; slug: string; metadata?: { deadline?: string } }>;
  completedFormIds: string[];
  hasMatchingSoftware: boolean;
  matchingSoftwareCompleted: boolean;
  hasSchedules: boolean;
  hasStudentSchedulesAccess: boolean;
};

/**
 * Whether an event is on right now. Decided in the browser, after hydration:
 * event dates and hours are Brussels local time, and the server runs in UTC.
 */
function useDuringEvent(event: CareerEvent): boolean {
  const [during, setDuring] = React.useState(false);
  React.useEffect(() => {
    const update = () => setDuring(isDuringEvent(event));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [event]);
  return during;
}

export function DashboardHome({
  managedEvents,
  upcomingEvents,
  orderingEnabled,
}: {
  managedEvents: ManagedEvent[];
  upcomingEvents: EventWithStatus[];
  orderingEnabled: boolean;
}) {
  return (
    <div className="w-full gap-4 flex flex-col">
      {/* --- Manage your events --- */}
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
        Manage your events
      </h2>

      {managedEvents.length === 0 ? (
        <div className="h-24 grid place-items-center text-sm text-muted-foreground">
          No events found for your company.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {managedEvents.map((managed) => (
            <ManageEventCard key={managed.event.id ?? managed.event.name} managed={managed} orderingEnabled={orderingEnabled} />
          ))}
        </div>
      )}

      {/* --- Discover upcoming events --- */}
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl mt-8 mb-10">
        Discover our upcoming events
      </h2>

      {upcomingEvents.length === 0 ? (
        <div className="h-24 grid place-items-center text-sm text-muted-foreground">
          No upcoming events at the moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {upcomingEvents.map((event, i) => {
            const isPast = event.isPast ?? false
            return (
              <div key={event.id ?? event.name} className={isPast ? 'opacity-60 grayscale' : ''}>
                <EventCard event={event} i={i} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}

function ManageEventCard({ managed, orderingEnabled }: { managed: ManagedEvent; orderingEnabled: boolean }) {
  const { event, forms, completedFormIds, hasMatchingSoftware, matchingSoftwareCompleted, hasSchedules, hasStudentSchedulesAccess } = managed;
  const hours = [event.start_hour, event.end_hour].filter(Boolean).join(" – ");
  const scansUrl = `/dashboard/scans/event/${encodeURIComponent(event.name)}`;
  const duringEvent = useDuringEvent(event);

  return (
    <Card className="border rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle>{event.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
            <span>Date</span>
            <span className="font-medium text-foreground">{String(event.date ?? "TBA")}</span>
            <span>Hours</span>
            <span className="font-medium text-foreground">{hours || "TBA"}</span>
            <span>Location</span>
            <span className="font-medium text-foreground">{String(event.location ?? "TBA")}</span>
            <span># Students</span>
            <span className="font-medium text-foreground">{String(event.num_of_students ?? "–")}</span>
          </div>
          
          <div className="space-y-2">
            {/* Company Forms - hidden during the event */}
            {!duringEvent && (
              forms.length > 0 ? (
                <div className="space-y-2">
                  {forms.map((form) => {
                    const isCompleted = completedFormIds.includes(form.id);
                    const formUrl = `/forms/company/${event.id}/${form.slug}`;
                    const metadata = form.metadata;
                    const hasDeadline = !!metadata?.deadline;
                    const deadline = metadata?.deadline ? new Date(metadata.deadline) : null;
                    const isDeadlinePassed = deadline ? deadline < new Date() : false;
                    
                    return (
                      <div key={form.id} className="space-y-1">
                        <Button
                          asChild
                          variant={isCompleted ? "outline" : "default"}
                          className={hasDeadline ? "w-full justify-start" : "w-full justify-center"}
                          size="sm"
                        >
                          <Link href={formUrl}>
                            {hasDeadline && <FileText className="h-4 w-4 mr-2" />}
                            {form.name}
                            {isCompleted && hasDeadline && <CheckCircle2 className="h-4 w-4 ml-auto text-green-600" />}
                            {isCompleted && !hasDeadline && <CheckCircle2 className="h-4 w-4 ml-2 text-green-600" />}
                          </Link>
                        </Button>
                        {hasDeadline && (
                          <p className={`text-xs ${isDeadlinePassed ? 'text-red-600' : 'text-red-500'} font-medium`}>
                            Deadline: {formatDateTimeBE(metadata.deadline as string)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null
            )}

            {/* Matching Software Button - only when event has it configured */}
            {hasMatchingSoftware && (
              <Button
                asChild
                variant={matchingSoftwareCompleted ? "outline" : "default"}
                className="w-full justify-center"
                size="sm"
              >
                <Link href={`/dashboard/matching-software/event/${encodeURIComponent(event.id)}`} className="flex items-center justify-center gap-2">
                  Matching Software
                  {matchingSoftwareCompleted && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                </Link>
              </Button>
            )}

            {/* Student Schedules Button - only when company has sub-option, event has schedules, and we're during the event */}
            {hasStudentSchedulesAccess && hasSchedules && duringEvent && (
              <Button
                asChild
                variant="outline"
                className="w-full justify-center"
                size="sm"
              >
                <Link href={`/dashboard/schedules/event/${encodeURIComponent(event.id)}`} className="flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Student Schedules
                </Link>
              </Button>
            )}

            {/* Order Drinks Button - only for event 4a1b38c1 (Career Day) when order system is open */}
            {event.id === "4a1b38c1-83f4-418e-b4c3-9e1ec680f832" && orderingEnabled && (
              <Button asChild variant="outline" className="w-full justify-center" size="sm">
                <Link href="/dashboard/order-drinks" className="flex items-center gap-2">
                  <Wine className="h-4 w-4" />
                  Order Drinks
                </Link>
              </Button>
            )}

            {/* Scans Button */}
            <Button asChild variant="outline" className="w-full">
              <Link href={scansUrl}>Scans</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EventCard({ event, i }: { event: CareerEvent; i: number }) {

  if (!event.href) return null; // skip if no href

  const isPast = (event as EventWithStatus).isPast ?? false

  return (
    <motion.a
      key={event.name}
      href={event.href}
      whileHover={isPast ? {} : { y: -8, rotate: i % 2 ? -1 : 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="group relative block"
    >
      <div className="rounded-[28px] bg-white/90 p-3 shadow-[0_10px_40px_rgba(11,77,140,0.08)] ring-1 ring-black/5 backdrop-blur-md">
        <div className="relative overflow-hidden rounded-[20px]">
          <div className="aspect-[4/3]">
            {event.image && (
              <Image
                src={getFileUrl(event.image)!}
                alt={event.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
        <div className="px-2 pb-2 pt-3">
          <div className="text-base font-semibold tracking-tight text-neutral-900">
            {event.name}
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-neutral-700">
            <Calendar className="h-4 w-4 text-vtk-blue" />
            <span>{event.date} · {event.location}</span>
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="absolute inset-x-6 -bottom-3 h-6 rounded-full bg-black/10 blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
    </motion.a>
  );
}

