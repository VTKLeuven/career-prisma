'use client'

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Company, Master, CareerEventOption, CareerEvent, Speaker } from "@/lib/schema";
import { getDirectusImageUrl } from "@/components/Images";
import Image from "next/image";
import Link from "next/link";
import { validateExistingPageImage } from "@/lib/utils/image-validation";
import { Calendar } from "lucide-react";
import { slugifyCompanyName, slugifyEventName } from "@/lib/utils/slugify";
import { fetchEventsAction } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, User, Star } from "lucide-react";
import { usePageLayout } from '../../layout';
import { CompanyLikeButton } from "@/components/CompanyLikeButton";
import { groupSpeakersByTimeSlot } from "@/lib/utils/speakers";
import { getSpeakerSlug } from "@/lib/utils/slugify";

type CategoryJunction = { master_id: Master | null };
type OptionJunction = { career_event_option_id: CareerEventOption | null };

function isCategoryJunction(value: unknown): value is CategoryJunction {
  return (
    typeof value === "object" &&
    value !== null &&
    "master_id" in value
  );
}

function isOptionJunction(value: unknown): value is OptionJunction {
  return (
    typeof value === "object" &&
    value !== null &&
    "career_event_option_id" in value
  );
}

export default function CompanyPage() {
  const { setHideLayoutHeader } = usePageLayout()
  const params = useParams();
  const router = useRouter();
  const companyName = Array.isArray(params.companyName) ? params.companyName[0] : params.companyName;
  const [company, setCompany] = useState<Company | null>(null);
  const [speakers, setSpeakers] = useState<Array<Speaker & { eventName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [pageImageValid, setPageImageValid] = useState<boolean | null>(null);
  const [allEvents, setAllEvents] = useState<CareerEvent[]>([]);

  // Hide layout header since this page renders its own
  useEffect(() => {
    setHideLayoutHeader(true)
    return () => setHideLayoutHeader(false)
  }, [setHideLayoutHeader])

  // Fetch all events for matching
  useEffect(() => {
    fetchEventsAction()
      .then((events) => setAllEvents(events ?? []))
      .catch((err) => console.error("Error fetching events:", err));
  }, []);

  useEffect(() => {
    if (!companyName || typeof companyName !== "string") {
      setLoading(false);
      return;
    }
    
    // Redirect to canonical slug if URL has special chars (+, _, etc.) so links work consistently
    const canonicalSlug = slugifyCompanyName(companyName);
    if (canonicalSlug && companyName !== canonicalSlug) {
      router.replace(`/company/${canonicalSlug}`);
      return;
    }

    async function loadCompany() {
      try {
        const res = await fetch(`/api/company/${encodeURIComponent(companyName ?? "")}`);
        const { hasCompanyPageAccess } = await import("@/lib/utils/company-access");
        let fetched: Company | null = null;
        let allSubOptions: import("@/lib/schema").CareerSubOption[] = [];
        if (res.ok) {
          const data = await res.json();
          fetched = data.company ?? null;
          allSubOptions = data.allSubOptions ?? [];
          setSpeakers(data.speakers ?? []);
        }
        if (fetched) {
          // Check if company has access to company page (sub-option + published)
          if (!hasCompanyPageAccess(fetched, allSubOptions ?? [])) {
            setCompany(null);
            setLoading(false);
            return;
          }

          // Normalize categories and options
          const rawCategory: unknown[] = Array.isArray(fetched.category)
            ? (fetched.category as unknown[])
            : [];
          const normalizedCategories: Master[] = rawCategory
            .filter(isCategoryJunction)
            .map((item) => item.master_id)
            .filter((m): m is Master => Boolean(m));

          const rawOptions: unknown[] = Array.isArray(fetched.options)
            ? (fetched.options as unknown[])
            : [];
          const normalizedOptions: CareerEventOption[] = rawOptions
            .filter(isOptionJunction)
            .map((item) => item.career_event_option_id)
            .filter((o): o is CareerEventOption => Boolean(o));

          setCompany({
            ...fetched,
            category: normalizedCategories,
            options: normalizedOptions,
          });
        } else {
          setCompany(null);
          setSpeakers([]);
        }
      } catch (error) {
        console.error("Error fetching company:", error);
        setCompany(null);
        setSpeakers([]);
      } finally {
        setLoading(false);
      }
    }

    loadCompany();
  }, [companyName, router]);

  // Validate page image when company or page_image changes
  const bgUrl = company ? getDirectusImageUrl(company.page_image) : null;
  useEffect(() => {
    if (bgUrl) {
      validateExistingPageImage(bgUrl)
        .then((result) => {
          setPageImageValid(result.valid);
        })
        .catch(() => {
          setPageImageValid(false);
        });
    } else {
      setPageImageValid(null);
    }
  }, [bgUrl]);

  if (loading) {
    return (
      <main className="min-h-svh bg-vtk-bg text-neutral-900 pt-24 md:pt-28">
        <div className="mx-auto max-w-7xl px-4 py-24">
          <div className="rounded-2xl border bg-white p-10 shadow-sm">
            <p className="text-neutral-600">Loading company...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="min-h-svh bg-vtk-bg text-neutral-900 pt-24 md:pt-28">
        <div className="mx-auto max-w-7xl px-4 py-24">
          <div className="rounded-2xl border bg-white p-10 shadow-sm">
            <h1 className="text-2xl font-semibold text-neutral-900">Company not found</h1>
            <p className="mt-2 text-neutral-600">We couldn&apos;t find this company. It may be private or the link is incorrect.</p>
            <div className="mt-6">
              <Link href="/" className="text-vtk-blue underline">Go back home</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const logoUrl = company ? getDirectusImageUrl(company.logo) : null;
  const categories = company ? ((company.category as Master[] | undefined) ?? []) : [];
  
  // Extract event IDs from company options using the same logic as dashboard
  const events: CareerEvent[] = (() => {
    if (!company || allEvents.length === 0) return [];
    
    const companyOptions = company.options ?? [];
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
    
    const extractEventFromRef = (eventOrJunction: unknown): CareerEvent | null => {
      if (!eventOrJunction || !isRecord(eventOrJunction)) return null;
      
      // Check if it's a junction table entry - try multiple possible field names
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
        } else {
          const eventId = getStringIdFromEventRef(opt.event);
          if (eventId) {
            companyEventIds.add(eventId);
          }
        }
        return;
      }
      
      if (!optionWithEvents) return;
      
      // Extract events from the option
      if (hasEvents(optionWithEvents) && Array.isArray(optionWithEvents.events)) {
        optionWithEvents.events.forEach((eventOrJunction: unknown) => {
          const event = extractEventFromRef(eventOrJunction);
          if (event?.id) {
            companyEventIds.add(event.id);
          } else {
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
    
    // Match event IDs with full event objects from allEvents
    return allEvents.filter((e) => companyEventIds.has(e.id));
  })();

  // Only use bgUrl if it's valid
  const validBgUrl = pageImageValid === true ? bgUrl : null;

  return (
    <main className="relative min-h-svh bg-vtk-bg text-neutral-900">
      <Header hasSpeakers={speakers.length > 0} />
      <div className="pt-24 md:pt-28">
        {validBgUrl && (
          <div className="absolute inset-0 z-0">
            <Image src={validBgUrl} alt={company.name} fill className="object-cover" />
          </div>
        )}
        <div className="relative z-10">
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="relative rounded-2xl border bg-white/85 backdrop-blur-sm p-6 shadow-sm">
            <CompanyLikeButton companyId={company.id} />
            <div className="flex items-center gap-3 sm:gap-5 flex-col sm:flex-row">
              <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl border bg-neutral-50 flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <Image src={logoUrl} alt={company.name} width={80} height={80} className="object-contain" />
                ) : (
                  <span className="text-sm text-neutral-500">No logo</span>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">{company.name}</h1>
                {categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3 justify-center sm:justify-start">
                    {categories.map((cat) => {
                      const catLogo = getDirectusImageUrl(cat.logo);
                      if (!catLogo) return null;
                      return (
                        <span
                          key={cat.id}
                          className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-transparent"
                        >
                          <Image src={catLogo} alt="" width={32} height={32} className="object-contain transform scale-110" />
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-6">
              {company.short_description && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-neutral-900">About</h2>
                  <div className="prose max-w-none mt-3" dangerouslySetInnerHTML={{ __html: company.short_description || "" }} />
                </div>
              )}

              {company.long_description && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-neutral-900">More details</h2>
                  <div className="prose max-w-none mt-3" dangerouslySetInnerHTML={{ __html: company.long_description || "" }} />
                </div>
              )}

              {speakers.length > 0 && (
                <div id="discovery-stage" className="rounded-2xl border bg-white/85 backdrop-blur-sm p-4 sm:p-6 shadow-sm scroll-mt-28">
                  <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-4 sm:mb-6">Discovery Stage</h2>
                  <CompanySpeakersSection speakers={speakers} />
                </div>
              )}

              {events.length > 0 && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-4 sm:p-6 shadow-sm">
                  <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-4 sm:mb-6">Attending at</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {events.slice(0, 3).map((event) => {
                      const href = `/event/${slugifyEventName(event.name || "")}`;
                      return (
                        <Link
                          key={event.id}
                          href={href}
                          className="group relative block h-full"
                        >
                          <div className="h-full flex flex-col rounded-[28px] bg-white/90 p-3 shadow-[0_10px_40px_rgba(11,77,140,0.08)] ring-1 ring-black/5 backdrop-blur-md transition-transform duration-300 hover:-translate-y-2 hover:rotate-1">
                            <div className="relative overflow-hidden rounded-[20px] flex-shrink-0">
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
                              {event.shout ? (
                                <span className="absolute left-3 top-3 rounded-full bg-vtk-yellow px-2 py-0.5 text-xs font-bold text-black shadow-sm">
                                  {event.shout}
                                </span>
                              ) : null}
                            </div>
                            <div className="px-2 pb-2 pt-3 flex-1 flex flex-col">
                              <div className="text-base font-semibold tracking-tight text-neutral-900 line-clamp-2">{event.name}</div>
                              <div className="mt-1 flex items-center gap-2 text-sm text-neutral-700">
                                <Calendar className="h-4 w-4 text-vtk-blue flex-shrink-0" />
                                <span className="line-clamp-1">{event.date} · {event.location}</span>
                              </div>
                            </div>
                          </div>
                          <div aria-hidden className="absolute inset-x-6 -bottom-3 h-6 rounded-full bg-black/10 blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <aside className="flex flex-col gap-4 sm:gap-6">
              {company.location && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-4 sm:p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-neutral-900">Located at</h3>
                  <div className="mt-2 text-sm text-neutral-700">{company.location}</div>
                </div>
              )}

              {company.website && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-4 sm:p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-neutral-900">Website</h3>
                  <div className="mt-2">
                    <Link href={company.website} target="_blank" className="text-vtk-blue underline break-all">{company.website}</Link>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
        </div>
      </div>
    </main>
  );
}

// ---------------- CompanySpeakersSection ----------------
const KU_LEUVEN_LOGO_ID = "d93c21e6-1145-4d4e-96d2-7e8daa640b9f";

function CompanySpeakersSection({ speakers }: { speakers: Array<Speaker & { eventName: string }> }) {
  const byEvent = new Map<string, Speaker[]>();
  for (const s of speakers) {
    const eventName = s.eventName ?? "Event";
    const list = byEvent.get(eventName) ?? [];
    list.push(s);
    byEvent.set(eventName, list);
  }

  return (
    <div className="space-y-8">
      {Array.from(byEvent.entries()).map(([eventName, eventSpeakers]) => {
        const eventSlug = slugifyEventName(eventName);
        const grouped = groupSpeakersByTimeSlot(eventSpeakers);
        return (
          <div key={eventName}>
            <h3 className="text-base font-semibold text-neutral-700 mb-3">{eventName}</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {grouped.map((group) =>
                group.length === 1 ? (
                  <CompanySpeakerCard key={group[0].id} speaker={group[0]} eventSlug={eventSlug} allSpeakers={eventSpeakers} />
                ) : (
                  <CompanySpeakerCardMulti key={group[0].id} speakers={group} eventSlug={eventSlug} allSpeakers={eventSpeakers} />
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompanySpeakerCard({ speaker, eventSlug, allSpeakers }: { speaker: Speaker; eventSlug: string; allSpeakers: Speaker[] }) {
  const rep = speaker.representative;
  const avatarUrl = rep?.avatar ? getDirectusImageUrl(rep.avatar) : undefined;
  const company = rep?.company;
  const displayCompany = company ?? { name: "KU Leuven", logo: KU_LEUVEN_LOGO_ID };
  const companyLogoUrl = displayCompany.logo ? getDirectusImageUrl(displayCompany.logo) : undefined;
  const startHour = speaker.time?.start_time;
  const endHour = speaker.time?.end_time;
  const timeLabel = startHour && endHour ? `${startHour} - ${endHour}` : startHour ?? endHour ?? null;

  return (
    <Link
      href={`/event/${eventSlug}/speakers/${getSpeakerSlug(speaker, allSpeakers)}`}
      className="flex w-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square w-full">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" fill className="object-cover" sizes="160px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-2xl font-semibold text-neutral-400">
            {(rep?.first_name?.[0] ?? rep?.last_name?.[0] ?? "?")}
          </div>
        )}
        {timeLabel && (
          <div className="absolute top-1.5 right-1.5 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-vtk-blue shadow-sm">
            {timeLabel}
          </div>
        )}
      </div>
      <div className="p-2 text-center">
        <div className="text-sm font-semibold text-neutral-900">{(rep?.first_name ?? "")} {rep?.last_name}</div>
        <div className="mt-1 flex items-center justify-center gap-1.5">
          {companyLogoUrl && (
            <div className="h-4 w-4 shrink-0 overflow-hidden rounded">
              <Image src={companyLogoUrl} alt={displayCompany.name} width={16} height={16} className="h-full w-full object-contain" />
            </div>
          )}
          <span className="text-xs text-neutral-600 truncate">{displayCompany.name}</span>
        </div>
      </div>
    </Link>
  );
}

function CompanySpeakerCardMulti({ speakers, eventSlug, allSpeakers }: { speakers: Speaker[]; eventSlug: string; allSpeakers: Speaker[] }) {
  const t = speakers[0]?.time;
  const timeLabel = t ? (t.start_time && t.end_time ? `${t.start_time} - ${t.end_time}` : t.start_time ?? t.end_time ?? null) : null;

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-square w-full flex">
        {speakers.map((speaker) => {
          const rep = speaker.representative;
          const avatarUrl = rep?.avatar ? getDirectusImageUrl(rep.avatar) : undefined;
          return (
            <Link
              key={speaker.id}
              href={`/event/${eventSlug}/speakers/${getSpeakerSlug(speaker, allSpeakers)}`}
              className="relative flex-1 min-w-0"
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" fill className="object-cover" sizes="160px" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-2xl font-semibold text-neutral-400">
                  {(rep?.first_name?.[0] ?? rep?.last_name?.[0] ?? "?")}
                </div>
              )}
            </Link>
          );
        })}
        {timeLabel && (
          <div className="absolute top-1.5 right-1.5 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-vtk-blue shadow-sm">
            {timeLabel}
          </div>
        )}
      </div>
      <div className="p-2 space-y-2">
        {speakers.map((speaker) => {
          const rep = speaker.representative;
          const company = rep?.company;
          const displayCompany = company ?? { name: "KU Leuven", logo: KU_LEUVEN_LOGO_ID };
          const companyLogoUrl = displayCompany.logo ? getDirectusImageUrl(displayCompany.logo) : undefined;
          return (
            <Link
              key={speaker.id}
              href={`/event/${eventSlug}/speakers/${getSpeakerSlug(speaker, allSpeakers)}`}
              className="block text-center hover:bg-neutral-50 -mx-1 px-1 py-0.5 rounded transition-colors"
            >
              <div className="text-sm font-semibold text-neutral-900">{(rep?.first_name ?? "")} {rep?.last_name}</div>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                {companyLogoUrl && (
                  <div className="h-4 w-4 shrink-0 overflow-hidden rounded">
                    <Image src={companyLogoUrl} alt={displayCompany.name} width={16} height={16} className="h-full w-full object-contain" />
                  </div>
                )}
                <span className="text-xs text-neutral-600 truncate">{displayCompany.name}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Header ----------------
function Header({ hasSpeakers = false }: { hasSpeakers?: boolean }) {
  const [openMenu, setOpenMenu] = useState<null | 'events'>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyRep, setCompanyRep] = useState<{ authenticated: boolean; name: string } | null>(null);
  const [student, setStudent] = useState<{ authenticated: boolean; firstName: string | null; lastName: string | null } | null>(null);
  const router = useRouter();
  const [EVENTS, setEvents] = useState<CareerEvent[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const eventsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEventsAction()
      .then((events) => { if (!cancelled) setEvents(events ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const checkAuthStatus = () => {
    fetch('/api/user/check?' + Date.now(), { cache: 'no-store', credentials: 'include' })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed')))
      .then((data) => {
        setCompanyRep(data?.companyRep?.authenticated ? data.companyRep : null);
        setStudent(data?.student?.authenticated ? data.student : null);
      })
      .catch(() => { setCompanyRep(null); setStudent(null); });
  };

  useEffect(() => {
    checkAuthStatus();
    window.addEventListener('focus', checkAuthStatus);
    return () => window.removeEventListener('focus', checkAuthStatus);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node) &&
          !(e.target as HTMLElement).closest('button[aria-expanded]')) setMobileMenuOpen(false);
      if (eventsMenuRef.current && !eventsMenuRef.current.contains(e.target as Node) &&
          !(e.target as HTMLElement).closest('button[aria-controls="mega-events"]')) setOpenMenu(null);
    };
    if (mobileMenuOpen || openMenu === 'events') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mobileMenuOpen, openMenu]);

  return (
    <header ref={menuRef} className="fixed top-2 sm:top-4 inset-x-0 z-50 w-full px-2 sm:px-0" aria-label="Site navigation">
      <div className="mx-auto max-w-7xl px-2 sm:px-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border bg-white/85 px-2 sm:px-3 md:px-5 py-1.5 sm:py-2 md:py-3 shadow-[0_12px_40px_rgba(0,0,0,0.10)] ring-1 ring-black/5 backdrop-blur-md">
          <Link href="/" className="flex shrink-0 items-center gap-1 sm:gap-2 rounded-full px-1 sm:px-2">
            <Image src="/career_blue.png" alt="VTK Career" width={120} height={40} className="h-6 sm:h-8 w-auto self-center" priority />
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            <Link href="/" className="rounded-full bg-vtk-blue px-4 py-2 text-sm font-medium text-white">Home</Link>
            <div className="relative">
              <button type="button" onMouseEnter={() => setOpenMenu('events')} onFocus={() => setOpenMenu('events')} onClick={() => setOpenMenu((s) => (s === 'events' ? null : 'events'))}
                className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100" aria-expanded={openMenu === 'events'} aria-controls="mega-events">
                Events <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <Link href="/our-students" className="rounded-full px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100">Our students</Link>
            <Link href="/vacancies" className="rounded-full px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100">Vacancies</Link>
            {hasSpeakers && (
              <a href="#discovery-stage" className="rounded-full px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
                onClick={(e) => { e.preventDefault(); document.getElementById("discovery-stage")?.scrollIntoView({ behavior: "smooth" }); }}>Discovery Stage</a>
            )}
          </nav>
          <nav className="md:hidden flex items-center gap-2">
            <Link href="/" className="rounded-full bg-vtk-blue px-3 py-1.5 text-xs font-medium text-white">Home</Link>
            <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100">Events</button>
            <Link href="/our-students" className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100">Our students</Link>
            <Link href="/vacancies" className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100">Vacancies</Link>
            {hasSpeakers && (
              <a href="#discovery-stage" className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100"
                onClick={(e) => { e.preventDefault(); document.getElementById("discovery-stage")?.scrollIntoView({ behavior: "smooth" }); }}>Discovery Stage</a>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {!student && <Button asChild variant="outline" className="hidden rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 md:inline-flex"><Link href={companyRep ? "/dashboard" : "/login"}>Company Dashboard</Link></Button>}
            {!student && !companyRep && <Button asChild className="hidden rounded-full bg-vtk-blue hover:bg-vtk-blueDark md:inline-flex text-white"><Link href="/student-login">Student login</Link></Button>}
            {!student && companyRep && <Button asChild className="hidden rounded-full bg-vtk-blue hover:bg-vtk-blueDark md:inline-flex text-white"><Link href="/contact">Contact Us</Link></Button>}
            {student && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="hidden rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 md:inline-flex">
                      <User className="h-4 w-4 mr-2" />{student.firstName} {student.lastName}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild><Link href="/student/liked-companies"><Star className="mr-2 h-4 w-4 fill-amber-300 text-amber-400" />Liked companies</Link></DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => { await fetch("/api/students/logout", { method: "POST" }); router.refresh(); window.location.href = "/"; }}>
                      <LogOut className="mr-2 h-4 w-4" />Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button asChild className="hidden rounded-full bg-vtk-blue hover:bg-vtk-blueDark md:inline-flex text-white"><Link href="/contact">Contact Us</Link></Button>
              </>
            )}
            {!mobileMenuOpen && <button type="button" onClick={() => setMobileMenuOpen(true)} className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-neutral-700 hover:bg-neutral-100" aria-expanded={mobileMenuOpen} aria-label="Open menu"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>}
            {mobileMenuOpen && <button type="button" onClick={() => setMobileMenuOpen(false)} className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-neutral-700 hover:bg-neutral-100" aria-expanded={mobileMenuOpen} aria-label="Close menu"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
          </div>
        </div>
      </div>
    </header>
  );
}
