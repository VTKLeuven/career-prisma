import type { CareerEvent } from "@/lib/schema";

/**
 * Returns true if the current time is between the event's start and end (inclusive).
 * Schedules should only be available during the event.
 */
export function isDuringEvent(event: CareerEvent): boolean {
  const { date, start_hour, end_hour } = event;
  if (!date || !start_hour || !end_hour) return false;
  try {
    const start = new Date(`${date}T${start_hour}`);
    const end = new Date(`${date}T${end_hour}`);
    const now = new Date();
    return now >= start && now <= end;
  } catch {
    return false;
  }
}

export type EventWithStatus = CareerEvent & {
  isPast?: boolean;
};

/**
 * Gets upcoming events, and if there are less than 3 upcoming events,
 * includes the most recent past events to always show exactly 3 events total.
 * Past events are marked with isPast: true.
 */
export function getUpcomingEventsWithFallback(
  events: CareerEvent[],
  targetCount: number = 3
): EventWithStatus[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Separate upcoming and past events
  const upcoming: EventWithStatus[] = [];
  const past: EventWithStatus[] = [];

  events.forEach((event) => {
    try {
      const eventDate = new Date(event.date);
      const eventDay = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      );

      if (eventDay >= today) {
        upcoming.push({ ...event, isPast: false });
      } else {
        past.push({ ...event, isPast: true });
      }
    } catch {
      // Skip invalid dates
    }
  });

  // Sort upcoming by date (ascending)
  upcoming.sort((a, b) => {
    try {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    } catch {
      return 0;
    }
  });

  // Sort past events by date (descending - most recent first)
  past.sort((a, b) => {
    try {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } catch {
      return 0;
    }
  });

  // Take all upcoming events (up to targetCount)
  const upcomingToShow = upcoming.slice(0, targetCount);
  
  // If we have enough upcoming events, return exactly targetCount
  if (upcomingToShow.length >= targetCount) {
    return upcomingToShow;
  }

  // Otherwise, add past events to fill up to targetCount total
  const needed = targetCount - upcomingToShow.length;
  const pastToAdd = past.slice(0, needed);

  return [...upcomingToShow, ...pastToAdd];
}

