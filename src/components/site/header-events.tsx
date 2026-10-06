"use client";

import { createContext, useContext } from "react";
import type { CareerEvent } from "@/lib/schema";

/** What the site header's events menu shows of an event. */
export type HeaderEvent = Pick<CareerEvent, "id" | "name" | "date" | "location" | "href">;

const HeaderEventsContext = createContext<HeaderEvent[] | null>(null);

/**
 * The published events for the site header's menu, loaded by the site layout
 * on the server -- every public page used to fetch /api/homepage for them
 * after hydrating.
 */
export function HeaderEventsProvider({ events, children }: { events: HeaderEvent[]; children: React.ReactNode }) {
  return <HeaderEventsContext.Provider value={events}>{children}</HeaderEventsContext.Provider>;
}

/** null outside the site layout; the header then fetches the events itself. */
export function useHeaderEvents(): HeaderEvent[] | null {
  return useContext(HeaderEventsContext);
}
