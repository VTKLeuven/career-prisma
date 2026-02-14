"use client";

import * as React from "react";
import Image from 'next/image'
import { getDirectusImageUrl } from "@/components/Images";
import { fetchCompanyByIdAction } from "@/app/actions/companies";
import { fetchEventsAction } from "@/app/actions/events";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion'
import { Calendar } from "lucide-react";
import type { CareerEvent, Company } from "@/lib/schema";
import { useUser } from "@/providers/UserProvider";
import Link from "next/link";
import { getUpcomingEventsWithFallback, type EventWithStatus } from '@/lib/utils/events';
import { fetchCompanyFormsForEventAction, checkCompanyFormCompletionByFormIdsAction } from '@/app/actions/forms';
import { getMatchingSoftwareForEventAction } from '@/app/actions/matching-software';
import { FileText, CheckCircle2 } from 'lucide-react';
import { formatDateTimeBE } from '@/lib/date-utils';

function MyEventsSection() {
  const { user } = useUser();
  const [allEvents, setAllEvents] = React.useState<CareerEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [company, setCompany] = React.useState<Company | null>(null);

  React.useEffect(() => {
    if (!user?.company?.id) return;

    fetchCompanyByIdAction(user.company.id).then((c) => {
      if (c) {
        setCompany(c as Company);
      } else {
        setCompany(null);
      }
    });
  }, [user?.company?.id]);


  React.useEffect(() => {
    let alive = true;

    fetchEventsAction()
      .then((rows) => {
        if (!alive) return;
        setAllEvents(rows ?? []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  // Company's own events
  const companyEvents = React.useMemo(() => {
    const companyOptions = company?.options ?? [];

    // Type guards
    const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
    const hasEvents = (v: unknown): v is { events: unknown } => isRecord(v) && 'events' in v;
    const hasEvent = (v: unknown): v is { event: unknown } => isRecord(v) && 'event' in v;
    
    const getStringIdFromEventRef = (ref: unknown): string | null => {
      if (typeof ref === 'string') return ref;
      if (isRecord(ref)) {
        const id = ref.id;
        return typeof id === 'string' ? id : null;
      }
      return null;
    };

    // Extract event from junction table entry or direct event object
    const extractEventFromRef = (eventOrJunction: unknown): CareerEvent | null => {
      if (!eventOrJunction || !isRecord(eventOrJunction)) return null;
      
      // Check if it's a junction table entry - try multiple possible field names
      // Directus junction tables can have different field names
      const possibleJunctionFields = ['career_event_id', 'career_event', 'event_id', 'event'];
      for (const fieldName of possibleJunctionFields) {
        if (fieldName in eventOrJunction) {
          const junction = eventOrJunction as Record<string, CareerEvent | string | null>;
          const eventRef = junction[fieldName];
          if (eventRef && typeof eventRef === 'object') {
            return eventRef as CareerEvent;
          }
        }
      }
      
      // Check if it's a direct event object
      if ('id' in eventOrJunction && 'name' in eventOrJunction) {
        return eventOrJunction as CareerEvent;
      }
      
      return null;
    };

    // Extract event IDs from the career_event_option objects (handle multiple events per option)
    const companyEventIds = new Set<string>();
    
    (companyOptions as unknown[]).forEach((opt, index) => {
      if (!opt || !isRecord(opt)) return;
      
      let optionWithEvents: Record<string, unknown> | null = null;
      
      // Shape B: option nested under career_event_option_id (junction table format from company)
      if ('career_event_option_id' in opt && opt.career_event_option_id) {
        const ceo = opt.career_event_option_id;
        if (isRecord(ceo)) {
          optionWithEvents = ceo;
        }
      }
      // Shape A: option has events array directly (already normalized)
      else if (hasEvents(opt)) {
        optionWithEvents = opt;
      }
      // Shape C: option has event directly (backward compatibility)
      else if (hasEvent(opt)) {
        const event = extractEventFromRef(opt.event);
        if (event?.id) {
          companyEventIds.add(event.id);
        }
        return;
      }
      
      if (!optionWithEvents) {
        return;
      }
      
      // Extract events from the option
      if (hasEvents(optionWithEvents) && Array.isArray(optionWithEvents.events)) {
        optionWithEvents.events.forEach((eventOrJunction: unknown) => {
          // Handle junction table format: events might be [{ career_event_id: EventObject }]
          const event = extractEventFromRef(eventOrJunction);
          if (event?.id) {
            companyEventIds.add(event.id);
          } else {
            // Fallback: try to get ID directly
            const eventId = getStringIdFromEventRef(eventOrJunction);
            if (eventId) {
              companyEventIds.add(eventId);
            }
          }
        });
      }
      // Fallback: handle single event (backward compatibility)
      else if (hasEvent(optionWithEvents)) {
        const event = extractEventFromRef(optionWithEvents.event);
        if (event?.id) {
          companyEventIds.add(event.id);
        } else {
          const eventId = getStringIdFromEventRef(optionWithEvents.event);
          if (eventId) {
            companyEventIds.add(eventId);
          }
        }
      }
    });

    return allEvents.filter((e) => companyEventIds.has(e.id));
  }, [allEvents, company]);

  // Upcoming events (future events and today's events sorted by date, showing first 4, with past events fallback)
  const upcomingEvents = React.useMemo(() => {
    return getUpcomingEventsWithFallback(allEvents, 4);
  }, [allEvents]);

  return (
    <div className="w-full gap-4 flex flex-col">
      {/* --- Manage your events --- */}
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
        Manage your events
      </h2>

      {loading ? (
        <div className="h-24 grid place-items-center text-sm text-muted-foreground">
          Loading events…
        </div>
      ) : companyEvents.length === 0 ? (
        <div className="h-24 grid place-items-center text-sm text-muted-foreground">
          No events found for your company.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companyEvents.map((event) => (
            <ManageEventCard key={event.id ?? event.name} event={event} company={company} />
          ))}
        </div>
      )}

      {/* --- Discover upcoming events --- */}
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl mt-8 mb-10">
        Discover our upcoming events
      </h2>

      {loading ? (
        <div className="h-24 grid place-items-center text-sm text-muted-foreground">
          Loading events…
        </div>
      ) : upcomingEvents.length === 0 ? (
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

function ManageEventCard({ event, company }: { event: CareerEvent; company: Company | null }) {
  const hours = [event.start_hour, event.end_hour].filter(Boolean).join(" – ");
  const scansUrl = `/dashboard/scans/event/${encodeURIComponent(event.name)}`;
  const [forms, setForms] = React.useState<Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    activeVersion: { id: string; version_number: number; schema: any };
  }>>([]);
  const [loadingForms, setLoadingForms] = React.useState(true);
  const [completedFormIds, setCompletedFormIds] = React.useState<Set<string>>(new Set());
  const [hasMatchingSoftware, setHasMatchingSoftware] = React.useState(false);
  const [matchingSoftwareCompleted, setMatchingSoftwareCompleted] = React.useState(false);

  // Get company option IDs
  const companyOptionIds = React.useMemo(() => {
    if (!company?.options) return [];
    return company.options
      .map((opt) => {
        if (typeof opt === 'string') return opt;
        if (opt && typeof opt === 'object') {
          // Check for junction table format: { career_event_option_id: { id: "..." } }
          if ('career_event_option_id' in opt) {
            const optionRef = (opt as any).career_event_option_id;
            if (typeof optionRef === 'string') return optionRef;
            if (optionRef && typeof optionRef === 'object' && 'id' in optionRef) {
              return optionRef.id;
            }
          }
          // Check for direct id
          if ('id' in opt) return opt.id;
        }
        return null;
      })
      .filter((id): id is string => id !== null);
  }, [company]);

  // Fetch company forms for this event
  React.useEffect(() => {
    if (!company?.id) {
      setLoadingForms(false);
      setForms([]);
      return;
    }

    fetchCompanyFormsForEventAction(event.id, companyOptionIds)
      .then(async (fetchedForms) => {
        setForms(fetchedForms);
        
        // Check which forms are completed (across all versions, not just active version)
        if (company?.id && fetchedForms.length > 0) {
          const formIds = fetchedForms.map((f) => f.id);
          const completedFormIds = await checkCompanyFormCompletionByFormIdsAction(company.id, formIds);
          setCompletedFormIds(completedFormIds);
        } else {
          setCompletedFormIds(new Set());
        }
      })
      .catch((err) => {
        console.error('[ManageEventCard] Error fetching company forms:', err);
        setForms([]);
      })
      .finally(() => setLoadingForms(false));
  }, [event.id, company?.id, companyOptionIds]);

  // Check if event has matching software configured and if company has completed it
  React.useEffect(() => {
    getMatchingSoftwareForEventAction(event.id)
      .then(async (ms) => {
        setHasMatchingSoftware(!!ms);
        if (ms && company?.id) {
          const { getCompanyMatchingResponseAction } = await import('@/app/actions/matching-software');
          const existing = await getCompanyMatchingResponseAction(company.id, ms.id);
          setMatchingSoftwareCompleted(!!existing?.ocia_answers && Object.keys(existing.ocia_answers).length >= 13);
        } else {
          setMatchingSoftwareCompleted(false);
        }
      })
      .catch(() => {
        setHasMatchingSoftware(false);
        setMatchingSoftwareCompleted(false);
      });
  }, [event.id, company?.id]);

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
            {/* Company Forms */}
            {loadingForms ? (
              <div className="text-xs text-muted-foreground">Loading forms...</div>
            ) : forms.length > 0 ? (
              <div className="space-y-2">
                {forms.map((form) => {
                  const isCompleted = completedFormIds.has(form.id);
                  const formUrl = `/forms/company/${event.id}/${form.slug}`;
                  const metadata = (form.activeVersion as any)?.metadata;
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
            ) : null}

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
                src={getDirectusImageUrl(event.image)!}
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

export default function DBLandingPage() {
  // const { user } = useUser();
  // if (!user?.admin) {
  //   return <p>NO ACCESS</p>
  // }

  return (
    <div className="flex flex-col gap-4">
      <MyEventsSection />
    </div>
  );
}
