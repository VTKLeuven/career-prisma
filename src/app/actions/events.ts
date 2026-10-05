// app/actions/events.ts
// File to do data manipulation 

"use server";
import { revalidatePath } from "next/cache";
import { listEvents, createEvent, updateEvent, deleteEvent } from "@/lib/repos/event";
import { listEventPages, getEventPageBySlug } from "@/lib/repos/event";
import { requireAdminUser } from "@/lib/auth-server";
import type { ActionResult } from "@/components/admin/types";
import { slugifyEventName } from "@/lib/utils/slugify";
import { getActiveMatchingSoftwareForEvent } from "@/lib/repos/matching-software";
import DOMPurify from 'isomorphic-dompurify';
import type { Company, CareerEvent, Speaker, TimeSlot, TimetableType } from "@/lib/schema";
import { listCareerEventOptions } from "@/lib/repos/option";
import { getCompaniesForEvent } from "@/lib/repos/company";
import { getOrCreateEventPage } from "@/lib/repos/floorplan";
import { getUserFromCookies } from "@/lib/auth-server";
import { addCompaniesToEventPage } from "@/lib/repos/event-page";
import { compareTimetableItems } from "@/lib/utils/timetable";
import { toPublicCompany, toPublicSpeaker } from "@/lib/repos/_shape";

export async function fetchEventsAction(opts?: {
  academicYearId?: string;
  includeHistory?: boolean;
  /** Public callers only -- see fetchPublicEventsAction. */
  publishedOnly?: boolean;
}) {
    const events = await listEvents({
      limit: 200,
      sort: "date",
      academicYearId: opts?.academicYearId,
      includeHistory: opts?.includeHistory,
      publishedOnly: opts?.publishedOnly,
    }) ?? [];
    events.map(el => {
        el.href = `/event/${slugifyEventName(el.name)}`;
        if (el.start_hour) el.start_hour = el.start_hour.slice(0, -3)
        if (el.end_hour) el.end_hour = el.end_hour.slice(0, -3)

    el.description = DOMPurify.sanitize(el.description as string, {
      ADD_ATTR: ['target', 'rel', 'allow', 'allowfullscreen', 'frameborder'],
      FORBID_TAGS: ['iframe', 'video', 'source', 'p'],
      // Example: only allow https: URLs
      ALLOWED_URI_REGEXP: /^(?:(?:https?):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    })
  })
  return events
}

/**
 * Events for anything a visitor can see: the homepage lists, the site header
 * dropdown, the company pages.
 *
 * `fetchEventsAction` deliberately returns drafts too -- the admin screens are
 * built to edit them -- so every public surface has to go through this instead.
 * A draft edition has no public event page, so listing it hands visitors a link
 * that 404s.
 */
export async function fetchPublicEventsAction() {
  return fetchEventsAction({ publishedOnly: true });
}

export async function fetchOptionsForEventAction(eventId: string) {
  await requireAdminUser();
  try {
    const allOptions = await listCareerEventOptions({ limit: 1000 }) ?? [];

    if (!allOptions || allOptions.length === 0) {
      return [];
    }

    // Filter options that are linked to this event
    const eventOptions = allOptions.filter((option) => {
      // Check events array (many-to-many relationship)
      if (option.events && Array.isArray(option.events)) {
        return option.events.some((eventOrJunction: unknown) => {
          if (!eventOrJunction || typeof eventOrJunction !== 'object') return false;

          // Check if it's a junction table entry with career_event_id field
          if ('career_event_id' in eventOrJunction) {
            const junction = eventOrJunction as { career_event_id: CareerEvent | string | null };
            const eventRef = junction.career_event_id;
            if (eventRef && typeof eventRef === 'object' && 'id' in eventRef) {
              return (eventRef as CareerEvent).id === eventId;
            }
            if (typeof eventRef === 'string') {
              return eventRef === eventId;
            }
          }

          // Check if it's a junction table entry with career_event field
          if ('career_event' in eventOrJunction) {
            const junction = eventOrJunction as { career_event: CareerEvent | string | null };
            const eventRef = junction.career_event;
            if (eventRef && typeof eventRef === 'object' && 'id' in eventRef) {
              return (eventRef as CareerEvent).id === eventId;
            }
            if (typeof eventRef === 'string') {
              return eventRef === eventId;
            }
          }

          // Check if it's a direct event object
          if ('id' in eventOrJunction) {
            return (eventOrJunction as CareerEvent).id === eventId;
          }

          return false;
        });
      }

      // Check single event (backward compatibility)
      if (option.event) {
        const eventRef = option.event;
        if (typeof eventRef === 'object' && eventRef !== null && 'id' in eventRef) {
          return (eventRef as CareerEvent).id === eventId;
        }
        if (typeof eventRef === 'string') {
          return eventRef === eventId;
        }
      }

      return false;
    });

    return eventOptions.map((opt) => ({
      id: opt.id,
      name: opt.name || '',
      description: opt.description || '',
    }));
  } catch (error) {
    console.error("[fetchOptionsForEventAction] Error:", error);
    return [];
  }
}

export async function fetchEventPagesAction(lim = 50) {
  const pages = await listEventPages({ limit: lim, sort: "event.date" }) ?? [];

  pages.map(page => {
    // ✅ Flatten timetable relation
    const validTypes: TimetableType[] = ['student', 'company', 'discovery'];
    page.timetable = ((page.timetable as unknown as Array<{ timetable_id: { id: string; title: string; start_time: string; end_time: string; description?: string; icon?: string; type?: string[]; speaker?: Speaker; speaker_id?: Speaker } }>)?.map((item) => {
      const slot = item.timetable_id;

      // Remove seconds from start_time and end_time
      if (slot.start_time) slot.start_time = slot.start_time.slice(0, -3);
      if (slot.end_time) slot.end_time = slot.end_time.slice(0, -3);

      // Normalize type to TimetableType[]
      const type: TimetableType[] | undefined = Array.isArray(slot.type)
        ? slot.type.filter((t): t is TimetableType => validTypes.includes(t as TimetableType))
        : undefined;
      const speaker = slot.speaker ?? slot.speaker_id ?? undefined;
      return { ...slot, type, speaker };
    }) ?? []).sort(compareTimetableItems) as TimeSlot[];

    page.companies = (page.companies as unknown as Array<{ company_id: Company }>)?.map((item) => {
      const company = item.company_id;

      return company;
    }) ?? [];

    // ✅ Clean up event times
    if (page.event?.start_hour) page.event.start_hour = page.event.start_hour.slice(0, -3);
    if (page.event?.end_hour) page.event.end_hour = page.event.end_hour.slice(0, -3);

    // ✅ Sanitize description
    if (page.event?.description) {
      page.event.description = DOMPurify.sanitize(page.event.description as string, {
        ADD_ATTR: ['target', 'rel', 'allow', 'allowfullscreen', 'frameborder'],
        FORBID_TAGS: ['iframe', 'video', 'source', 'p'],
        ALLOWED_URI_REGEXP: /^(?:(?:https?):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
      });
    }

    // ✅ Build href
    page.event.href = `/event/${page.event.series_key || slugifyEventName(page.event.name)}`;
  });

  return pages;
}

export async function fetchEventPageBySlugAction(slug: string) {
  const page = await getEventPageBySlug(slug);

  if (!page) {
    return null;
  }

  // ✅ Flatten timetable relation
  const validTypes: TimetableType[] = ['student', 'company', 'discovery'];
  page.timetable = ((page.timetable as unknown as Array<{ timetable_id: { id: string; title: string; start_time: string; end_time: string; description?: string; icon?: string; type?: string[]; speaker?: Speaker; speaker_id?: Speaker } }>)?.map((item) => {
    const slot = item.timetable_id;

    // Remove seconds from start_time and end_time
    if (slot.start_time) slot.start_time = slot.start_time.slice(0, -3);
    if (slot.end_time) slot.end_time = slot.end_time.slice(0, -3);

    // Normalize type to TimetableType[]
    const type: TimetableType[] | undefined = Array.isArray(slot.type)
      ? slot.type.filter((t): t is TimetableType => validTypes.includes(t as TimetableType))
      : undefined;
    const speaker = slot.speaker ?? slot.speaker_id ?? undefined;
    return { ...slot, type, speaker: toPublicSpeaker(speaker) };
  }) ?? []).sort(compareTimetableItems) as TimeSlot[];

  // This feeds the public event page and /api/events/<slug>: companies lose
  // their representatives and sales history, speakers their contact details.
  page.companies = (page.companies as unknown as Array<{ company_id: Company }>)?.map((item) =>
    toPublicCompany(item.company_id)
  ) ?? [];

  // ✅ Flatten speakers (M2M: speakers.speaker_id or speakers direct)
  page.speakers = (page.speakers as unknown as Array<{ speaker_id?: Speaker; id?: string; representative?: Speaker["representative"]; time?: Speaker["time"] }>)?.map((item) => {
    const speaker = item.speaker_id ?? item;
    if (!speaker || typeof speaker !== "object") return null;
    const rep = speaker.representative;
    const time = speaker.time;
    const startTime = time?.start_time ? time.start_time.slice(0, -3) : undefined;
    const endTime = time?.end_time ? time.end_time.slice(0, -3) : undefined;
    return toPublicSpeaker({
      id: (speaker as { id?: string }).id ?? "",
      personal_information: (speaker as Speaker).personal_information ?? null,
      content: (speaker as Speaker).content ?? null,
      representative: rep ?? null,
      time: time ? { ...time, start_time: startTime ?? time.start_time, end_time: endTime ?? time.end_time } : null,
    } as Speaker);
  }).filter((s): s is Speaker => !!s) ?? [];

  // ✅ Clean up event times
  if (page.event?.start_hour) page.event.start_hour = page.event.start_hour.slice(0, -3);
  if (page.event?.end_hour) page.event.end_hour = page.event.end_hour.slice(0, -3);

  // ✅ Sanitize description
  if (page.event?.description) {
    page.event.description = DOMPurify.sanitize(page.event.description as string, {
      ADD_ATTR: ['target', 'rel', 'allow', 'allowfullscreen', 'frameborder'],
      FORBID_TAGS: ['iframe', 'video', 'source', 'p'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    });
  }

  // ✅ Build href
  page.event.href = `/event/${page.event.series_key || slugifyEventName(page.event.name)}`;

  // Check if matching software is active for this event (for header button visibility)
  const hasActiveMatchingSoftware = !!(await getActiveMatchingSoftwareForEvent(page.event.id));

  return { ...page, hasActiveMatchingSoftware };
}

/**
 * Find companies that have options registered for a specific event
 */
/** The admin event cards' setup status for several events, in one call. */
export async function fetchEventSetupStatusesAction(eventIds: string[]) {
  await requireAdminUser();
  const { getEventSetupStatuses } = await import("@/lib/repos/event-page");
  return getEventSetupStatuses(eventIds);
}

export async function findCompaniesWithEventOptions(eventId: string): Promise<Company[]> {
  await requireAdminUser();
  try {
    // One join in the database. This used to load every company with its
    // full include and walk five shapes of option/event junction in JS.
    return await getCompaniesForEvent(eventId);
  } catch (error) {
    console.error("Error finding companies with event options:", error);
    return [];
  }
}

/**
 * Add companies to an event page
 */
export async function addCompaniesToEventPageAction(
  eventId: string,
  companyIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!companyIds || companyIds.length === 0) {
      return { success: false, error: "No companies selected" };
    }

    const user = await getUserFromCookies();
    if (!user?.admin) {
      return { success: false, error: "Unauthorized" };
    }

    // Get or create event page
    const eventPage = await getOrCreateEventPage(eventId);
    if (!eventPage) {
      return { success: false, error: "Failed to get or create event page" };
    }

    await addCompaniesToEventPage(Number(eventPage.id), companyIds);

    return { success: true };
  } catch (error) {
    console.error("Error adding companies to event page:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add companies",
    };
  }
}

/* ------------------------------------------------------------------ *
 * Career event writes
 * ------------------------------------------------------------------ */

export async function createEventAction(data: Record<string, unknown>): Promise<ActionResult<CareerEvent>> {
  try {
    await requireAdminUser();
    const event = await createEvent(data);
    revalidatePath("/admin/companies-events");
    revalidatePath("/admin/events");
    revalidatePath("/admin/event-pages");
    revalidatePath("/event");
    return { success: true, data: event };
  } catch (error) {
    console.error("[createEventAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create event" };
  }
}

export async function updateEventAction(id: string, data: Record<string, unknown>): Promise<ActionResult<CareerEvent>> {
  try {
    await requireAdminUser();
    const event = await updateEvent(id, data);
    revalidatePath("/admin/companies-events");
    revalidatePath("/admin/events");
    revalidatePath("/admin/event-pages");
    revalidatePath("/event");
    return { success: true, data: event };
  } catch (error) {
    console.error("[updateEventAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update event" };
  }
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminUser();
    await deleteEvent(id);
    revalidatePath("/admin/companies-events");
    revalidatePath("/admin/events");
    revalidatePath("/admin/event-pages");
    revalidatePath("/event");
    return { success: true };
  } catch (error) {
    console.error("[deleteEventAction]", error);
    return {
      success: false,
      error:
        "Could not delete this event. It still has an event page, matching software or schedules linked — remove those first.",
    };
  }
}
