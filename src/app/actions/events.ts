// app/actions/events.ts
// File to do data manipulation 

"use server";
import { listEvents } from "@/lib/repos/event";
import { listEventPages, getEventPageBySlug } from "@/lib/repos/event";
import DOMPurify from 'isomorphic-dompurify';
import type { Company } from "@/lib/schema";

export async function fetchEventsAction() {
    const events = await listEvents({ limit: 50, sort: "date" }) ?? [];
    events.map(el => {
        el.href = `/event/${el.name.toLowerCase().replace(/\s+/g, "-")}`;
        el.start_hour = el.start_hour.slice(0, -3)
        el.end_hour = el.end_hour.slice(0, -3)

        el.description = DOMPurify.sanitize(el.description as string, {
            ADD_ATTR: ['target', 'rel', 'allow', 'allowfullscreen', 'frameborder'],
            FORBID_TAGS: ['iframe', 'video', 'source', 'p'],
            // Example: only allow https: URLs
            ALLOWED_URI_REGEXP: /^(?:(?:https?):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
        })
    })
    return events
}

export async function fetchEventPagesAction(lim = 50) {
  const pages = await listEventPages({ limit: lim, sort: "event.date" }) ?? [];

  pages.map(page => {
    // ✅ Flatten timetable relation
    page.timetable = (page.timetable as unknown as Array<{ timetable_id: { id: string; title: string; start_time: string; end_time: string; description?: string; icon?: string } }>)?.map((item) => {
      const slot = item.timetable_id;

      // Remove seconds from start_time and end_time
      if (slot.start_time) slot.start_time = slot.start_time.slice(0, -3);
      if (slot.end_time) slot.end_time = slot.end_time.slice(0, -3);

      return slot;
    }) ?? [];

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
    page.event.href = `/event/${page.event.name.toLowerCase().replace(/\s+/g, "-")}`;
  });

  return pages;
}

export async function fetchEventPageBySlugAction(slug: string) {
  const page = await getEventPageBySlug(slug);
  
  if (!page) {
    return null;
  }

  // ✅ Flatten timetable relation
  page.timetable = (page.timetable as unknown as Array<{ timetable_id: { id: string; title: string; start_time: string; end_time: string; description?: string; icon?: string } }>)?.map((item) => {
    const slot = item.timetable_id;

    // Remove seconds from start_time and end_time
    if (slot.start_time) slot.start_time = slot.start_time.slice(0, -3);
    if (slot.end_time) slot.end_time = slot.end_time.slice(0, -3);

    return slot;
  }) ?? [];

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
  page.event.href = `/event/${page.event.name.toLowerCase().replace(/\s+/g, "-")}`;

  return page;
}
