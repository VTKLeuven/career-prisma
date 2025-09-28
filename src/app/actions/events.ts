// app/actions/events.ts
// File to do data manipulation 

"use server";
import { listEvents } from "@/lib/repos/event";
import { listEventPages } from "@/lib/repos/event";
import DOMPurify from 'isomorphic-dompurify';

export async function fetchEventsAction() {
    const events = await listEvents({ limit: 50, sort: "name" }) ?? [];
    events.map(el => {
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
    const pages = await listEventPages({ limit: lim, sort: "date" }) ?? [];
    pages.map(page => {
        page.event.start_hour = page.event.start_hour.slice(0, -3)
        page.event.end_hour = page.event.end_hour.slice(0, -3)

        page.event.description = DOMPurify.sanitize(page.event.description as string, {
            ADD_ATTR: ['target', 'rel', 'allow', 'allowfullscreen', 'frameborder'],
            FORBID_TAGS: ['iframe', 'video', 'source', 'p'],
            // Example: only allow https: URLs
            ALLOWED_URI_REGEXP: /^(?:(?:https?):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
        })
        page.href = `/event?${new URLSearchParams({ name: page.event.name }).toString()}`;
    })
    return pages
}
