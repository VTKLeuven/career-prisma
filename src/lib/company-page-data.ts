import "server-only";

import { fetchCompanyBySlugWithSubOptionsAction, fetchSpeakersForCompanyAction } from "@/app/actions/companies";
import { getCachedCompanyPage, setCachedCompanyPage } from "@/lib/company-page-cache";
import type { CareerSubOption, Company } from "@/lib/schema";
import type { SpeakerWithEvent } from "@/lib/repos/event";

export type CompanyPageData = {
  company: Company | null;
  allSubOptions: CareerSubOption[];
  speakers: SpeakerWithEvent[];
};

/** "13:00:00" -> "13:00", as the event page shows its times. */
function hhmm(time: string | null | undefined): string | undefined {
  return time ? time.slice(0, 5) : undefined;
}

/**
 * A public company page's data, through the company-page cache: the company
 * (public view), every sub-option (for the page-access check) and the
 * company's Discovery Stage speakers. The page renders it on the server;
 * /api/company/<slug> serves the same object.
 */
export async function loadCompanyPage(slug: string): Promise<CompanyPageData> {
  const cached = getCachedCompanyPage(slug) as CompanyPageData | null;
  if (cached) return cached;

  const result = await fetchCompanyBySlugWithSubOptionsAction(slug);
  if (!result.company) return { company: null, allSubOptions: result.allSubOptions, speakers: [] };

  const speakers = (await fetchSpeakersForCompanyAction(result.company.id)).map((speaker) =>
    speaker.time
      ? { ...speaker, time: { ...speaker.time, start_time: hhmm(speaker.time.start_time), end_time: hhmm(speaker.time.end_time) } }
      : speaker
  ) as SpeakerWithEvent[];
  const data = { ...result, speakers };
  setCachedCompanyPage(slug, data);
  return data;
}
