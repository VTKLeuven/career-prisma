"use client";

import * as React from "react";
import Image from 'next/image'
import { getDirectusImageUrl } from "@/components/Images";
import { fetchCompanyByIdAction } from "@/app/actions/companies";
import { fetchEventsAction } from "@/app/actions/events";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion'
import { Calendar } from "lucide-react";
import type { CareerEvent, Company } from "@/lib/schema";
import { useUser } from "@/providers/UserProvider";

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
        // Debug: log company options structure
        console.log("Company options structure:", {
          optionsCount: c.options?.length || 0,
          firstOption: c.options?.[0] ? {
            hasCareerEventOptionId: 'career_event_option_id' in (c.options[0] as any),
            hasEvents: 'events' in ((c.options[0] as any)?.career_event_option_id || c.options[0] as any),
            structure: Object.keys(c.options[0] as any),
          } : null,
        });
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
      
      // Check if it's a junction table entry with career_event_id field
      if ('career_event_id' in eventOrJunction) {
        const junction = eventOrJunction as { career_event_id: CareerEvent | string | null };
        if (junction.career_event_id) {
          // If it's already an object (populated), return it
          if (typeof junction.career_event_id === 'object' && junction.career_event_id !== null) {
            return junction.career_event_id as CareerEvent;
          }
          // If it's just an ID string, we can't use it here (would need to fetch)
          return null;
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
        // Debug: log option structure that we couldn't parse
        if (index === 0) {
          console.log("Option structure that couldn't be parsed:", Object.keys(opt));
        }
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
            } else if (index === 0) {
              // Debug: log first event structure that couldn't be parsed
              console.log("Event structure that couldn't be parsed:", eventOrJunction);
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
      } else if (index === 0) {
        // Debug: log option that has no events
        console.log("Option with no events field:", {
          keys: Object.keys(optionWithEvents),
          option: optionWithEvents,
        });
      }
    });

    // Debug: log extracted event IDs
    if (companyEventIds.size > 0) {
      console.log(`Extracted ${companyEventIds.size} event IDs:`, Array.from(companyEventIds));
    } else if (companyOptions.length > 0) {
      console.warn("No event IDs extracted from company options", {
        optionsCount: companyOptions.length,
        firstOption: companyOptions[0],
      });
    }

    return allEvents.filter((e) => companyEventIds.has(e.id));
  }, [allEvents, company]);

  // Upcoming events (future events sorted by date, showing first 4)
  const upcomingEvents = React.useMemo(() => {
    const now = new Date();
    return allEvents
      .filter((e) => new Date(e.date) > now) // assumes `startDate` field exists
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4);
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
            <ManageEventCard key={event.id ?? event.name} event={event} />
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
          {upcomingEvents.map((event, i) => (
            <EventCard key={event.id ?? event.name} event={event} i={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function ManageEventCard({ event }: { event: CareerEvent }) {
  const hours = [event.start_hour, event.end_hour].filter(Boolean).join(" – ");

  return (
    <Card className="border rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle>{event.name}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </CardContent>
    </Card>
  );
}

function EventCard({ event, i }: { event: CareerEvent; i: number }) {

  if (!event.href) return null; // skip if no href

  return (
    <motion.a
      key={event.name}
      href={event.href}
      whileHover={{ y: -8, rotate: i % 2 ? -1 : 1 }}
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
