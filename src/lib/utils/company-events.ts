import type { CareerEvent, Company } from "@/lib/schema";

/**
 * Ids of the events a company takes part in: the events linked to the
 * career-event options it bought. Handles the several shapes a shaped
 * company's `options` can take (junction rows, normalised options, the old
 * single `event` field).
 */
export function getCompanyEventIds(company: Company | null): Set<string> {
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
  
  (companyOptions as unknown[]).forEach((opt) => {
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

  return companyEventIds;
}

/** Ids of the career-event options a company holds, from its `options`. */
export function getCompanyOptionIds(company: Company | null): string[] {
  if (!company?.options) return [];
  return company.options
    .map((opt) => {
      if (typeof opt === 'string') return opt;
      if (opt && typeof opt === 'object') {
        // Check for junction table format: { career_event_option_id: { id: "..." } }
        if ('career_event_option_id' in opt) {
          const optionRef = (opt as { career_event_option_id?: unknown }).career_event_option_id;
          if (typeof optionRef === 'string') return optionRef;
          if (optionRef && typeof optionRef === 'object' && 'id' in optionRef) {
            return String((optionRef as { id: unknown }).id);
          }
        }
        // Check for direct id
        if ('id' in opt) return String((opt as { id: unknown }).id);
      }
      return null;
    })
    .filter((id): id is string => id !== null);
}

/** The events from `events` that the company takes part in. */
export function getCompanyEvents(events: CareerEvent[], company: Company | null): CareerEvent[] {
  const ids = getCompanyEventIds(company);
  return events.filter((e) => ids.has(e.id));
}
