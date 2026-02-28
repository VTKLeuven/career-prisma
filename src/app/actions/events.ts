// app/actions/events.ts
// File to do data manipulation 

"use server";
import { listEvents } from "@/lib/repos/event";
import { listEventPages, getEventPageBySlug } from "@/lib/repos/event";
import { slugifyEventName } from "@/lib/utils/slugify";
import { getActiveMatchingSoftwareForEvent } from "@/lib/repos/matching-software";
import DOMPurify from 'isomorphic-dompurify';
import type { Company, CareerEvent, CareerEventOption } from "@/lib/schema";
import { listCareerEventOptions } from "@/lib/repos/option";
import { listCompanies } from "@/lib/repos/company";
import { getOrCreateEventPage } from "@/lib/repos/floorplan";
import { getDirectusWithToken } from "@/lib/directus";
import { updateItem, readItems } from "@directus/sdk";

export async function fetchEventsAction() {
    const events = await listEvents({ limit: 50, sort: "date" }) ?? [];
    events.map(el => {
        el.href = `/event/${slugifyEventName(el.name)}`;
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

export async function fetchOptionsForEventAction(eventId: string) {
  try {
    const client = await getDirectusWithToken();
    if (!client) {
      return [];
    }

    // Fetch all options with their events relationship loaded
    // This is more reliable than querying the junction table directly
    const allOptions = await client.request(
      readItems("career_event_option", {
        fields: ["id", "name", "description", { events: ["*", { career_event_id: ["*"], career_event: ["*"] }], event: ["*", "id"] } as any],
        limit: 1000,
      })
    ) as unknown as CareerEventOption[];

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
    page.event.href = `/event/${slugifyEventName(page.event.name)}`;
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
  page.event.href = `/event/${slugifyEventName(page.event.name)}`;

  // Check if matching software is active for this event (for header button visibility)
  const hasActiveMatchingSoftware = !!(await getActiveMatchingSoftwareForEvent(page.event.id));

  return { ...page, hasActiveMatchingSoftware };
}

/**
 * Find companies that have options registered for a specific event
 */
export async function findCompaniesWithEventOptions(eventId: string): Promise<Company[]> {
  try {
    // Fetch all companies with their options - use -1 for unlimited
    const allCompanies = await listCompanies({ limit: -1 }) ?? [];

    // Filter companies that have options with this event
    const companiesWithEvent: Company[] = [];

    for (const company of allCompanies) {
      if (!company.options || company.options.length === 0) continue;

      // Check if any option has this event
      for (const opt of company.options) {
        let rawOption: CareerEventOption | null = null;

        // Handle junction table format
        if (opt && typeof opt === 'object' && 'career_event_option_id' in opt) {
          const junction = opt as { career_event_option_id: CareerEventOption | null };
          rawOption = junction.career_event_option_id;
        } else {
          rawOption = opt as CareerEventOption;
        }

        if (!rawOption) continue;

        // Check if option has events array
        if (rawOption.events && Array.isArray(rawOption.events)) {
          const hasEvent = rawOption.events.some((eventOrJunction: unknown) => {
            if (!eventOrJunction || typeof eventOrJunction !== 'object') return false;

            // Check if it's a junction table entry
            const possibleJunctionFields = ['career_event_id', 'career_event', 'event_id', 'event'];
            for (const fieldName of possibleJunctionFields) {
              if (fieldName in eventOrJunction) {
                const junction = eventOrJunction as Record<string, CareerEvent | string | null>;
                const eventRef = junction[fieldName];
                if (eventRef && typeof eventRef === 'object' && 'id' in eventRef) {
                  return (eventRef as CareerEvent).id === eventId;
                }
                if (typeof eventRef === 'string') {
                  return eventRef === eventId;
                }
              }
            }

            // Check if it's a direct event object
            if ('id' in eventOrJunction) {
              return (eventOrJunction as CareerEvent).id === eventId;
            }

            return false;
          });

          if (hasEvent) {
            companiesWithEvent.push(company);
            break; // Found a matching option, no need to check others
          }
        } else if (rawOption.event) {
          // Fallback for backward compatibility
          const eventRef = rawOption.event;
          if (typeof eventRef === 'object' && eventRef !== null && 'id' in eventRef) {
            if ((eventRef as CareerEvent).id === eventId) {
              companiesWithEvent.push(company);
              break;
            }
          } else if (typeof eventRef === 'string' && eventRef === eventId) {
            companiesWithEvent.push(company);
            break;
          }
        }
      }
    }

    return companiesWithEvent;
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

    const client = await getDirectusWithToken();
    if (!client) {
      return { success: false, error: "Not authenticated" };
    }

    // Get or create event page
    const eventPage = await getOrCreateEventPage(eventId);
    if (!eventPage) {
      return { success: false, error: "Failed to get or create event page" };
    }

    // Get current companies on the event page
    const currentPage = await client.request(
      readItems("career_event_page", {
        fields: ["companies.company_id.id" as any],
        filter: {
          id: { _eq: eventPage.id },
        },
        limit: 1,
      })
    ) as unknown as Array<{ companies?: Array<{ company_id: { id: string } }> }>;

    const existingCompanyIds = new Set(
      (currentPage[0]?.companies ?? []).map((item) => item.company_id.id)
    );

    // Filter out companies that are already on the page
    const newCompanyIds = companyIds.filter((id) => !existingCompanyIds.has(id));

    if (newCompanyIds.length === 0) {
      return { success: true }; // All companies already added
    }

    // Get all current company IDs (existing + new)
    const allCompanyIds = [
      ...Array.from(existingCompanyIds),
      ...newCompanyIds,
    ];

    // Update the event page with all companies
    // In Directus, many-to-many relationships are updated by passing an array of IDs
    await client.request(
      updateItem("career_event_page", eventPage.id, {
        companies: allCompanyIds.map((id) => ({ company_id: id })),
      })
    );

    return { success: true };
  } catch (error) {
    console.error("Error adding companies to event page:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add companies",
    };
  }
}
