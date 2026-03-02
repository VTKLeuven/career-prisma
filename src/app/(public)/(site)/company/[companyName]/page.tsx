'use client'

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Company, Master, CareerEventOption, CareerEvent } from "@/lib/schema";
import { getDirectusImageUrl } from "@/components/Images";
import Image from "next/image";
import Link from "next/link";
import { validateExistingPageImage } from "@/lib/utils/image-validation";
import { Calendar } from "lucide-react";
import { fetchCompanyBySlugWithSubOptionsAction } from "@/app/actions/companies";
import { slugifyCompanyName, slugifyEventName } from "@/lib/utils/slugify";
import { fetchEventsAction } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, LogOut, User } from "lucide-react";
import { usePageLayout } from '../../layout';
import { usePathname } from 'next/navigation';
import { getUpcomingEventsWithFallback } from '@/lib/utils/events';

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
        const [{ company: fetched, allSubOptions }, { hasCompanyPageAccess }] = await Promise.all([
          fetchCompanyBySlugWithSubOptionsAction(companyName ?? ""),
          import("@/lib/utils/company-access"),
        ]);
        if (fetched) {
          // Check if company has access to company page (sub-option + page_on_platform + published)
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
        }
      } catch (error) {
        console.error("Error fetching company:", error);
        setCompany(null);
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
      <Header />
      <div className="pt-24 md:pt-28">
        {validBgUrl && (
          <div className="absolute inset-0 z-0">
            <Image src={validBgUrl} alt={company.name} fill className="object-cover" />
          </div>
        )}
        <div className="relative z-10">
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-6 shadow-sm">
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

// ---------------- Header ----------------
function Header() {
  const [openMenu, setOpenMenu] = useState<null | 'events'>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [companyRep, setCompanyRep] = useState<{ authenticated: boolean; name: string } | null>(null)
  const [student, setStudent] = useState<{ authenticated: boolean; firstName: string | null; lastName: string | null } | null>(null)
  const router = useRouter()
  const [EVENTS, setEvents] = useState<CareerEvent[]>([]);
  const menuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const eventsMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
      fetchEventsAction().then(setEvents);
  }, []);

  const checkAuthStatus = () => {
    fetch('/api/user/check?' + Date.now(), { 
      cache: 'no-store',
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to check auth status');
        }
        return res.json();
      })
      .then((data) => {
        // Explicitly handle null/undefined - ensure we set null if API returns null or undefined
        if (data.companyRep && data.companyRep.authenticated === true) {
          setCompanyRep(data.companyRep);
        } else {
          setCompanyRep(null);
        }
        if (data.student && data.student.authenticated === true) {
          setStudent(data.student);
        } else {
          setStudent(null);
        }
      })
      .catch(() => {
        // User not authenticated - clear state
        setCompanyRep(null);
        setStudent(null);
      });
  };

  useEffect(() => {
    // Check user authentication status on mount
    checkAuthStatus();

    // Listen for focus event (user might have logged in in another tab)
    window.addEventListener('focus', checkAuthStatus);

    return () => {
      window.removeEventListener('focus', checkAuthStatus);
    };
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) &&
          !(event.target as HTMLElement).closest('button[aria-expanded]')) {
        setMobileMenuOpen(false)
      }
      if (eventsMenuRef.current && !eventsMenuRef.current.contains(event.target as Node) &&
          !(event.target as HTMLElement).closest('button[aria-controls="mega-events"]')) {
        setOpenMenu(null)
      }
    }

    if (mobileMenuOpen || openMenu === 'events') {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mobileMenuOpen, openMenu])

  return (
    <header
      ref={menuRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setOpenMenu(null);
          setMobileMenuOpen(false);
        }
      }}
      className="fixed top-2 sm:top-4 inset-x-0 z-50 w-full px-2 sm:px-0"
      aria-label="Site navigation"
    >
      <div className="mx-auto max-w-7xl px-2 sm:px-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border bg-white/85 px-2 sm:px-3 md:px-5 py-1.5 sm:py-2 md:py-3 shadow-[0_12px_40px_rgba(0,0,0,0.10)] ring-1 ring-black/5 backdrop-blur-md">
          <Link href="/" className="flex shrink-0 items-center gap-1 sm:gap-2 rounded-full px-1 sm:px-2">
            <Image 
              src="/career_blue.png" 
              alt="VTK Career" 
              width={120} 
              height={40} 
              className="h-6 sm:h-8 w-auto self-center"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <Link href="/" className="rounded-full bg-vtk-blue px-4 py-2 text-sm font-medium text-white">Home</Link>

            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setOpenMenu('events')}
                onFocus={() => setOpenMenu('events')}
                onClick={() => setOpenMenu((s) => (s === 'events' ? null : 'events'))}
                className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
                aria-expanded={openMenu === 'events'}
                aria-controls="mega-events"
              >
                Events <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <Link href="/our-students" className="rounded-full px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100">Our students</Link>
            <Link href="/vacancies" className="rounded-full px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100">Vacancies</Link>
          </nav>

          {/* Mobile nav - Events as simple button */}
          <nav className="md:hidden flex items-center gap-2">
            <Link href="/" className="rounded-full bg-vtk-blue px-3 py-1.5 text-xs font-medium text-white">Home</Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100"
            >
              Events
            </button>
            <Link href="/our-students" className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100">Our students</Link>
            <Link href="/vacancies" className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100">Vacancies</Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {!student && (
              <Button asChild variant="outline" className="hidden rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 md:inline-flex">
                <Link href={companyRep ? "/dashboard" : "/login"}>Company Dashboard</Link>
              </Button>
            )}
            {!student && !companyRep && (
              <Button asChild className="hidden rounded-full bg-vtk-blue hover:bg-vtk-blueDark md:inline-flex text-white"><Link href="/student-login">Student login</Link></Button>
            )}
            {companyRep && (
              <Button asChild className="hidden rounded-full bg-vtk-blue hover:bg-vtk-blueDark md:inline-flex text-white"><Link href="/contact">Contact Us</Link></Button>
            )}
            {student && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="hidden rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 md:inline-flex">
                      <User className="h-4 w-4 mr-2" />
                      {student.firstName} {student.lastName}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={async () => {
                        await fetch("/api/students/logout", { method: "POST" });
                        router.refresh();
                        window.location.href = "/";
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button asChild className="hidden rounded-full bg-vtk-blue hover:bg-vtk-blueDark md:inline-flex text-white"><Link href="/contact">Contact Us</Link></Button>
              </>
            )}
            
            {/* Mobile menu button - only show if menu is closed (Events button handles opening) */}
            {!mobileMenuOpen && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-vtk-blue"
                aria-expanded={mobileMenuOpen}
                aria-label="Open menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            {mobileMenuOpen && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-vtk-blue"
                aria-expanded={mobileMenuOpen}
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 md:hidden"
          >
            <div className="mx-auto max-w-7xl px-2 sm:px-4">
              <div className="rounded-xl sm:rounded-2xl border bg-white/95 backdrop-blur-md shadow-xl p-4">
                {/* Events Section */}
                <div className="mb-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-900">Upcoming events</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full border-vtk-blue text-vtk-blue hover:bg-vtk-blue/5 text-xs px-3"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        // Check if we're on the homepage
                        if (window.location.pathname === '/') {
                          // Dispatch custom event that homepage can listen to
                          window.dispatchEvent(new CustomEvent('viewAllEvents'));
                          // Also set hash for URL consistency
                          window.location.hash = '#all-events';
                        } else {
                          // Navigate to homepage with hash
                          window.location.href = '/#all-events';
                        }
                      }}
                    >
                      View all
                    </Button>
                  </div>
                  <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {EVENTS
                      .filter((e) => {
                        try {
                          const eventDate = new Date(e.date);
                          const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
                          const now = new Date();
                          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                          return eventDay >= today; // Include today and future events
                        } catch {
                          return false;
                        }
                      })
                      .sort((a, b) => {
                        try {
                          return new Date(a.date).getTime() - new Date(b.date).getTime();
                        } catch {
                          return 0;
                        }
                      })
                      .slice(0, 6)
                      .map((event) => (
                        <li key={event.name}>
                          <Link 
                            href={event.href ?? '#'} 
                            className="block rounded-lg border bg-neutral-50 p-3 hover:bg-vtk-light/40 transition"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <div className="text-sm font-medium text-neutral-900">{event.name}</div>
                            <div className="mt-1 text-xs text-neutral-600">{event.date} · {event.location}</div>
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>

                {/* Other Links */}
                <div className="border-t pt-4 space-y-2">
                  {!student && (
                    <Button 
                      asChild
                      variant="outline" 
                      className="rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 w-full"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href={companyRep ? "/dashboard" : "/login"}>Company Dashboard</Link>
                    </Button>
                  )}
                  {!student && !companyRep && (
                    <Button 
                      asChild
                      className="rounded-full bg-vtk-blue hover:bg-vtk-blueDark w-full text-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/student-login">Student login</Link>
                    </Button>
                  )}
                  {companyRep && (
                    <Button 
                      asChild
                      className="rounded-full bg-vtk-blue hover:bg-vtk-blueDark w-full text-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/contact">Contact Us</Link>
                    </Button>
                  )}
                  {student && (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 w-full">
                            <User className="h-4 w-4 mr-2" />
                            {student.firstName} {student.lastName}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem
                            onClick={async () => {
                              await fetch("/api/students/logout", { method: "POST" });
                              router.refresh();
                              window.location.href = "/";
                            }}
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button 
                        asChild
                        className="rounded-full bg-vtk-blue hover:bg-vtk-blueDark w-full text-white"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/contact">Contact Us</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Events Menu */}
      <AnimatePresence>
        {openMenu === 'events' && (
          <motion.div
            ref={eventsMenuRef}
            id="mega-events"
            key="mega"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 hidden md:block"
            onMouseEnter={() => setOpenMenu('events')}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <div className="mx-auto max-w-7xl px-4">
              <div className="rounded-2xl border bg-white/85 backdrop-blur-md shadow-xl -mx-8">
                <div className="grid grid-cols-1 gap-8 px-4 py-8 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-neutral-900">Upcoming events</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-vtk-blue text-vtk-blue hover:bg-vtk-blue/5"
                        onClick={() => {
                          setOpenMenu(null);
                          // Check if we're on the homepage
                          if (window.location.pathname === '/') {
                            // Dispatch custom event that homepage can listen to
                            window.dispatchEvent(new CustomEvent('viewAllEvents'));
                            // Also set hash for URL consistency
                            window.location.hash = '#all-events';
                          } else {
                            // Navigate to homepage with hash
                            window.location.href = '/#all-events';
                          }
                        }}
                      >
                        View all
                      </Button>
                    </div>
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {EVENTS
                        .filter((e) => {
                          try {
                            const eventDate = new Date(e.date);
                            const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
                            const now = new Date();
                            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            return eventDay >= today; // Include today and future events
                          } catch {
                            return false;
                          }
                        })
                        .sort((a, b) => {
                          try {
                            return new Date(a.date).getTime() - new Date(b.date).getTime();
                          } catch {
                            return 0;
                          }
                        })
                        .slice(0, 8)
                        .map((event) => (
                          <li key={event.name} className="rounded-xl border p-3 hover:bg-vtk-light/40">
                            <Link href={event.href ?? '#'} className="block">
                              <div className="text-sm font-medium text-neutral-900">{event.name}</div>
                              <div className="mt-0.5 text-xs text-neutral-600">{event.date} · {event.location}</div>
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>

                  <div className="hidden md:block">
                    <div className="h-full rounded-2xl border bg-vtk-light p-5">
                      <div className="text-sm font-medium text-neutral-900">Featured</div>
                      <p className="mt-1 text-sm text-neutral-700">Meet 200+ companies at our flagship jobfair in Leuven.</p>
                      <div className="mt-4">
                        <Button asChild className="rounded-full bg-vtk-blue hover:bg-vtk-blueDark">
                          <Link href="/event/vtk-jobfair">Explore jobfair</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </header>
  )
}


