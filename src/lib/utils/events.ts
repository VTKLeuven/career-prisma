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

/** Academic years run September -> August, so the boundary is the 9th month. */
function academicYearOf(value: Date): number {
  return value.getMonth() >= 8 ? value.getFullYear() : value.getFullYear() - 1;
}

/**
 * The academic year an event belongs to, as its starting calendar year.
 *
 * The stored relation wins, because that is what the rest of the app scopes by.
 * Deriving it from the event's own date is the fallback for an event whose
 * academic year was never linked.
 */
function eventAcademicYear(event: CareerEvent): number | null {
  const linked = (event as { academic_year?: { start_of_year?: string } | null })
    .academic_year?.start_of_year;
  if (linked) {
    const parsed = new Date(linked);
    if (!Number.isNaN(parsed.getTime())) return parsed.getFullYear();
  }
  try {
    const parsed = new Date(event.date);
    if (!Number.isNaN(parsed.getTime())) return academicYearOf(parsed);
  } catch {
    // Fall through.
  }
  return null;
}

/**
 * Gets upcoming events, and if there are fewer than `targetCount`, pads with
 * recent past events so the section never looks half empty. Past events are
 * marked with isPast: true and are rendered greyed out.
 *
 * Padding is scoped to one academic year: the current one, or the one before it
 * when this season has not had an event yet. Unscoped, the homepage reaches
 * back through the whole archive and a fair from several years ago turns up
 * under "Upcoming events", which reads as a bug rather than as a look back at
 * the season.
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

  // Otherwise, pad with past events -- but only from one academic year, so an
  // empty season shows fewer cards instead of resurrecting an old edition.
  const pastYears = past
    .map(eventAcademicYear)
    .filter((year): year is number => year !== null);

  // This season, or last season when this one has not happened yet. Anything
  // older stays buried: "most recent in the list" would happily surface a fair
  // from three years ago the moment the archive has nothing newer.
  const currentAcademicYear = academicYearOf(now);
  const referenceYear = pastYears.includes(currentAcademicYear)
    ? currentAcademicYear
    : pastYears.includes(currentAcademicYear - 1)
      ? currentAcademicYear - 1
      : null;

  const pastInScope =
    referenceYear === null
      ? []
      : past.filter((event) => eventAcademicYear(event) === referenceYear);

  const needed = targetCount - upcomingToShow.length;
  const pastToAdd = pastInScope.slice(0, needed);

  return [...upcomingToShow, ...pastToAdd];
}

