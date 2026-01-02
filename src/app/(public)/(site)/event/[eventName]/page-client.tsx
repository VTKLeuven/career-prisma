'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollCue } from '@/components/ScrollCue'
import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useParams } from "next/navigation"
import { fetchEventPageBySlugAction, fetchEventsAction } from "@/app/actions/events"
import { getDirectusImageUrl } from "@/components/Images";
import { slugifyCompanyName } from "@/lib/utils/slugify";
import { CareerEventPage, Company, CareerEvent } from '@/lib/schema'
import dynamic from "next/dynamic"
import HeroiconDynamic from "@/components/HeroiconDynamic"
import { ChevronDown, MapPin, Car, ExternalLink, LogOut, User } from 'lucide-react'
import { useBannerPage } from '@/hooks/use-banner-page'
import { usePageLayout } from '../../layout'
import { getUpcomingEventsWithFallback } from '@/lib/utils/events';

const EventMap = dynamic(() => import("@/components/EventMap").then(mod => mod.EventMap), {
  ssr: false,
})

export default function EventPageClient({ 
  initialPage,
  eventName: initialEventName 
}: { 
  initialPage?: CareerEventPage | null
  eventName?: string
}) {
  const { setHideLayoutHeader } = usePageLayout()
  const [page, setPage] = useState<CareerEventPage | null>(initialPage ?? null)
  const [isLoading, setIsLoading] = useState(!initialPage)
  const [popupMessage, setPopupMessage] = useState<string>("")
  const [popupContent, setPopupContent] = useState<React.ReactNode>(null)
  useBannerPage()

  const params = useParams()
  const eventName = initialEventName || (Array.isArray(params.eventName)
  ? params.eventName[0]
  : params.eventName)

  // Fetch the specific event page
  const loadedEventRef = useRef<string | null>(null)
  const pageCacheRef = useRef<Map<string, CareerEventPage>>(new Map())
  const fetchPromiseRef = useRef<Map<string, Promise<CareerEventPage | null>>>(new Map())

  // Start fetching immediately, don't wait for useEffect
  useEffect(() => {
    // If we have initial page data, use it and skip fetching
    if (initialPage && !page && eventName) {
      setPage(initialPage)
      pageCacheRef.current.set(eventName, initialPage)
      setIsLoading(false)
      return
    }

    // Skip if no eventName
    if (!eventName) {
      setIsLoading(false)
      return
    }

    // Check cache first - if cached, use it immediately
    const cached = pageCacheRef.current.get(eventName)
    if (cached) {
      setPage(cached)
      setIsLoading(false)
      return
    }

    // Reset loading state when eventName changes (only if no initial page)
    if (!initialPage) {
      setIsLoading(true)
      setPage(null)
    }

    // Prevent duplicate loads of the same event
    if (loadedEventRef.current === eventName) {
      return
    }

    // Mark as loading BEFORE async operation
    loadedEventRef.current = eventName

    async function load() {
      if (!eventName) return
      
      try {
        // Check cache again (might have been set by another component)
        const cached = pageCacheRef.current.get(eventName)
        if (cached) {
          if (loadedEventRef.current !== eventName) return
          setPage(cached)
          setIsLoading(false)
          return
        }

        // Check if there's already a fetch in progress for this event
        let fetchPromise = fetchPromiseRef.current.get(eventName)
        if (!fetchPromise) {
          // Use API route for better caching and CDN support
          fetchPromise = fetch(`/api/events/${eventName}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => {
              // Fallback to direct server action if API fails
              return fetchEventPageBySlugAction(eventName)
            })
          fetchPromiseRef.current.set(eventName, fetchPromise)
        }

        const found = await fetchPromise
        fetchPromiseRef.current.delete(eventName)

        // Verify we're still loading the same event
        if (loadedEventRef.current !== eventName) return

        if (found) {
          // Cache the result
          pageCacheRef.current.set(eventName, found)
          setPage(found)
          
          // Note: Next.js Image with priority will handle preloading automatically
        } else {
          setPage(null)
        }
      } catch (error) {
        console.error('Error loading event page:', error)
        if (eventName) {
          fetchPromiseRef.current.delete(eventName)
        }
        // Reset ref on error so we can retry
        if (loadedEventRef.current === eventName) {
          loadedEventRef.current = null
        }
        setPage(null)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [eventName])

  const showPopupMessage = (msg: string) => {
    setPopupMessage(msg)
    setPopupContent(null)
  }

  const showPopupContent = (content: React.ReactNode) => {
    setPopupContent(content)
    setPopupMessage("")
  }

  const closePopup = () => {
    setPopupMessage("")
    setPopupContent(null)
  }

  // Hide layout header since this page renders its own
  useEffect(() => {
    setHideLayoutHeader(true)
    
    // Prefetch homepage data when on event page for faster navigation back
    if (typeof window !== 'undefined') {
      fetch('/api/homepage').catch(() => {}) // Fire and forget
    }
    
    return () => setHideLayoutHeader(false)
  }, [setHideLayoutHeader])

  // Check if event has a floorplan to determine which header to show
  const hasFloorplan = !!page?.floorplan

  return (
    <>
      {hasFloorplan ? (
        <Header page={page ?? undefined} />
      ) : (
        <HomepageHeader />
      )}

      <Hero
        page={page ?? undefined}
        isLoading={isLoading}
        showPopupMessage={showPopupMessage}
        showPopupContent={showPopupContent}
      />

      <PracticalInformation page={page ?? undefined} />

      <Popup
        message={popupMessage}
        content={popupContent}
        onClose={closePopup}
      />
    </>
  )
}

// Homepage-style header for non-fair events
function HomepageHeader() {
  const [openMenu, setOpenMenu] = useState<null | 'events'>(null)
  const [menuOpenedViaClick, setMenuOpenedViaClick] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [companyRep, setCompanyRep] = useState<{ authenticated: boolean; name: string } | null>(null)
  const [student, setStudent] = useState<{ authenticated: boolean; firstName: string | null; lastName: string | null } | null>(null)
  const router = useRouter()
  const [EVENTS, setEvents] = useState<CareerEvent[]>([]);
  const menuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const eventsMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Use API route for better caching
    fetch('/api/homepage')
      .then(res => res.json())
      .then((data) => setEvents(data.events ?? []))
      .catch(() => {
        // Fallback to direct action
        fetchEventsAction().then(setEvents);
      });
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

    // Check periodically (every 30 seconds) to catch login state changes
    const interval = setInterval(checkAuthStatus, 30000);

    return () => {
      window.removeEventListener('focus', checkAuthStatus);
      clearInterval(interval);
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
        setMenuOpenedViaClick(false)
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
          setMenuOpenedViaClick(false);
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
                onMouseEnter={() => {
                  if (!menuOpenedViaClick) {
                    setOpenMenu('events')
                  }
                }}
                onFocus={() => setOpenMenu('events')}
                onClick={() => {
                  setOpenMenu('events')
                  setMenuOpenedViaClick(true)
                }}
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

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-vtk-blue"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
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
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full border-neutral-300 text-neutral-800 hover:bg-neutral-100 w-full"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/our-students">Our students</Link>
                  </Button>
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
            onMouseLeave={() => {
              if (!menuOpenedViaClick) {
                setOpenMenu(null)
              }
            }}
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

function Header({ page }: { page?: CareerEventPage }) {
  const [companyRep, setCompanyRep] = useState<{ authenticated: boolean; name: string } | null>(null)
  const [student, setStudent] = useState<{ authenticated: boolean; firstName: string | null; lastName: string | null } | null>(null)
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) &&
          !(event.target as HTMLElement).closest('button[aria-expanded]')) {
        setMobileMenuOpen(false)
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mobileMenuOpen])

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

    // Check periodically (every 30 seconds) to catch login state changes
    const interval = setInterval(checkAuthStatus, 30000);

    return () => {
      window.removeEventListener('focus', checkAuthStatus);
      clearInterval(interval);
    };
  }, [])

  return (
    <header
      ref={menuRef}
      className="fixed top-2 sm:top-4 inset-x-0 z-50 w-full px-2 sm:px-0"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
        }
      }}
    >
      <div className="mx-auto max-w-7xl px-2 sm:px-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border bg-white/85 px-2 sm:px-3 md:px-5 py-1.5 sm:py-2 md:py-3 shadow-md">

          {/* Logo */}
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

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-2 md:flex">
            <Link href="/" className="rounded-full bg-vtk-blue px-4 py-2 text-sm font-medium text-white">
              Home
            </Link>
            {page && (
              <>
                <Link
                  href={`/event/${page.event.name.toLowerCase().replace(/\s+/g, "-")}/floorplan`}
                  className="rounded-full px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
                >
                  Floorplan
                </Link>
                {page.company_guide && (
                  <CompanyGuideButton 
                    companyGuide={page.company_guide} 
                    isMobile={false}
                    eventName={page.event.name.toLowerCase().replace(/\s+/g, "-")}
                  />
                )}
              </>
            )}
          </nav>

          {/* Mobile Nav - Show Home, Floorplan, Matching Software */}
          <nav className="md:hidden flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0">
            <Link href="/" className="rounded-full bg-vtk-blue px-2.5 py-1 text-xs font-medium text-white whitespace-nowrap shrink-0">
              Home
            </Link>
            {page && (
              <>
                <Link
                  href={`/event/${page.event.name.toLowerCase().replace(/\s+/g, "-")}/floorplan`}
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-100 whitespace-nowrap shrink-0"
                >
                  Floorplan
                </Link>
                {page.company_guide && (
                  <CompanyGuideButton 
                    companyGuide={page.company_guide} 
                    isMobile={true}
                    eventName={page.event.name.toLowerCase().replace(/\s+/g, "-")}
                  />
                )}
              </>
            )}
          </nav>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
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

            {/* Mobile menu button */}
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

      {/* Mobile Menu - Only Company Dashboard and Student login */}
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
                <div className="space-y-2">
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
    </header>
  )
}

// ---------------- Hero ----------------
function Hero({
  page,
  isLoading,
  showPopupMessage,
  showPopupContent,
}: {
  page?: CareerEventPage
  isLoading: boolean
  showPopupMessage: (msg: string) => void
  showPopupContent: (content: React.ReactNode) => void
}) {
  const ref = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"])
  const imageUrl = page?.image ? getDirectusImageUrl(page.image) : null

  const handleRegisterClick = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if (!page?.registration_link) {
      e.preventDefault();
      showPopupMessage("Registration is not open yet. Please check back soon!");
    } else {
      window.open(page.registration_link, "_blank");
    }
  };

  const handleExploreCompanies = (e: React.MouseEvent) => {
    e.preventDefault()

    const companies: Company[] = (page?.companies ?? []).filter(
      (c): c is NonNullable<typeof c> => !!c
    )

    if (companies.length === 0) {
      showPopupMessage("Company list coming soon!")
      return
    }

    // Determine max per row: 8 max
    const maxPerRow = companies.length <= 8 ? companies.length : 8
    const rows: Company[][] = []
    for (let i = 0; i < companies.length; i += maxPerRow) {
      rows.push(companies.slice(i, i + maxPerRow))
    }

    showPopupContent(<CompanyPopup companies={companies} />)
  }

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden border-b min-h-[85vh] sm:min-h-[75vh] md:min-h-[82vh] -mt-2 pt-24 sm:pt-28 md:pt-32"
    >
      {/* Background */}
      <motion.div aria-hidden className="absolute inset-0" style={{ y }}>
        {/* Show event image immediately when available, fallback only when loading */}
        {imageUrl ? (
          <div className="absolute inset-0">
            {/* Mobile: Show center vertical slice by making container wider and centering */}
            <div className="md:hidden absolute inset-0 overflow-hidden">
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[200vw] h-full">
                <Image
                  src={imageUrl}
                  alt={page?.event?.name ?? "VTK Career events crowd"}
                  fill
                  priority
                  fetchPriority="high"
                  loading="eager"
                  className="object-cover"
                  style={{
                    objectPosition: 'center center'
                  }}
                  sizes="100vw"
                />
              </div>
            </div>
            {/* Desktop: Normal display */}
            <div className="hidden md:block absolute inset-0">
              <Image
                src={imageUrl}
                alt={page?.event?.name ?? "VTK Career events crowd"}
                fill
                priority
                className="object-cover"
                style={{
                  objectPosition: 'center center'
                }}
                sizes="100vw"
              />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0">
            {/* Mobile: Show center vertical slice by making container wider and centering */}
            <div className="md:hidden absolute inset-0 overflow-hidden">
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[200vw] h-full">
                <Image
                  src="https://directustest.vtk.be/assets/1be725c7-bc66-47ba-b956-e7ae59978983.jpg"
                  alt="VTK Career events crowd"
                  fill
                  priority
                  className="object-cover"
                  style={{
                    objectPosition: 'center center'
                  }}
                  sizes="100vw"
                />
              </div>
            </div>
            {/* Desktop: Normal display */}
            <div className="hidden md:block absolute inset-0">
              <Image
                src="https://directustest.vtk.be/assets/1be725c7-bc66-47ba-b956-e7ae59978983.jpg"
                alt="VTK Career events crowd"
                fill
                priority
                className="object-cover"
                style={{
                  objectPosition: 'center center'
                }}
                sizes="100vw"
              />
            </div>
          </div>
        )}
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/45 to-black/25" />

      {/* Text - Mobile: bottom aligned with more padding, Desktop: original position */}
      <div className="absolute inset-x-0 bottom-0 md:top-4/7 md:bottom-auto pb-6 sm:pb-4 md:pb-0 md:-translate-y-1/2">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AnimatePresence mode="wait">
            {!isLoading && page?.event ? (
              <motion.div
                key="event-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-3 sm:mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs text-white backdrop-blur-sm">
                  {page.tagline}
                </div>
                <h1 className="text-balance text-5xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.05] sm:leading-[1.1] tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] mb-3 sm:mb-2">
                  {page.event.name}
                </h1>
                <p className="max-w-2xl font-black text-white/95 text-lg sm:text-lg md:text-xl lg:text-2xl mt-2 sm:mt-1 uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                  {page.event.date} – {page.event.location}
                </p>
                <div
                  className="prose prose-invert max-w-2xl text-white/90 text-sm sm:text-base md:text-lg mt-4 sm:mt-4 drop-shadow-sm"
                  dangerouslySetInnerHTML={{ __html: page.description_EN }}
                />
                <div className="mt-5 sm:mt-6 md:mt-10 flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Register button */}
                  <Button
                    variant="ghost"
                    className="rounded-full bg-vtk-yellow text-black hover:brightness-95 cursor-pointer text-sm sm:text-base"
                    onClick={handleRegisterClick}
                  >
                    Register
                  </Button>

                  {/* Floorplan button if floorplan exists, otherwise Explore companies */}
                  {page?.floorplan ? (
                    <Button
                      asChild
                      variant="ghost"
                      className="rounded-full bg-vtk-blue-dark text-white hover:brightness-95 cursor-pointer text-sm sm:text-base"
                    >
                      <Link href={`/event/${page.event.name.toLowerCase().replace(/\s+/g, "-")}/floorplan`}>
                        Floorplan
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="rounded-full bg-vtk-blue-dark text-white hover:brightness-95 cursor-pointer text-sm sm:text-base"
                      onClick={handleExploreCompanies}
                    >
                      Explore companies
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="loading-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="h-6 w-32 rounded-full bg-white/20 animate-pulse" />
                <div className="h-16 sm:h-20 md:h-24 w-3/4 rounded-lg bg-white/20 animate-pulse" />
                <div className="h-6 w-48 rounded-lg bg-white/20 animate-pulse" />
                <div className="h-20 sm:h-24 w-full max-w-2xl rounded-lg bg-white/20 animate-pulse" />
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-5 sm:mt-6 md:mt-10">
                  <div className="h-10 w-24 rounded-full bg-white/20 animate-pulse" />
                  <div className="h-10 w-32 rounded-full bg-white/20 animate-pulse" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ScrollCue />
    </section>
  )
}

// ---------------- CompanyPopup ----------------

function CompanyPopup({ companies }: { companies: Company[] }) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)

  if (selectedCompany) {
    const slug = slugifyCompanyName(selectedCompany.name);

    return (
      <div
        className="flex flex-col items-center justify-center gap-4 text-center px-6 py-4"
        // Block events from reaching the backdrop/overlay:
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-2xl font-semibold text-vtk-blue">{selectedCompany.name}</h2>
        </div>

        {selectedCompany.short_description && (
          <div
            className="text-neutral-800 mt-2 prose prose-sm text-center"
            dangerouslySetInnerHTML={{ __html: selectedCompany.short_description }}
          />
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            className="text-vtk-blue text-lg font-bold"
            onClick={() => setSelectedCompany(null)}
          >
            ← Back
          </button>

          {selectedCompany?.page_on_platform === true && selectedCompany?.status === "published" && (
            <Link
              href={`/company/${slug}`}
              // (Optional) also stop bubbling on the link itself:
              onClick={(e) => e.stopPropagation()}
              className="inline-flex rounded-full bg-vtk-blue text-white px-4 py-2 text-sm font-medium hover:bg-vtk-blueDark"
            >
              View company page
            </Link>
          )}
        </div>
      </div>
    );
  }

  // All companies grid (smaller boxes)
  return (
    <div className="flex flex-col items-center gap-6 px-6 py-4 max-w-5xl mx-auto">
      <h2 className="text-2xl font-semibold text-vtk-blue mb-4 text-center">Attending Companies</h2>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4"
      >
        {companies.map((company, i) => {
          const logoUrl = company.logo ? getDirectusImageUrl(company.logo) : undefined
          if (!logoUrl) return null
          return (
            <motion.div
              key={i}
              className="group cursor-pointer"
              whileHover={{ y: -2, scale: 1.03 }}
              onClick={() => setSelectedCompany(company)}
            >
              <div className="rounded-lg bg-white/90 p-3 text-center shadow-[0_6px_20px_rgba(11,77,140,0.08)] ring-1 ring-black/5 backdrop-blur-md hover:shadow-lg transition-shadow duration-200">
                <div className="h-16 w-full flex items-center justify-center">
                  <Image
                    src={logoUrl}
                    alt={company.name ?? "Company logo"}
                    width={80}
                    height={48}
                    className="object-contain"
                  />
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}



// ---------------- Company Guide Button ----------------
function CompanyGuideButton({ companyGuide, isMobile, eventName }: { 
  companyGuide: string | { id?: string } | null | undefined
  isMobile: boolean
  eventName: string
}) {
  // Handle both string ID and object with id property
  const fileId = !companyGuide 
    ? null 
    : typeof companyGuide === 'string' 
      ? companyGuide 
      : companyGuide?.id || null

  if (!fileId) return null

  // Use the event route for download
  const eventSlug = eventName.toLowerCase().replace(/\s+/g, "-")
  const downloadUrl = `/api/event/${eventSlug}/company-guide/download`

  return (
    <a
      href={downloadUrl}
      download
      className={isMobile 
        ? "rounded-full px-2.5 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-100 whitespace-nowrap shrink-0"
        : "rounded-full px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
      }
    >
      Company Guide
    </a>
  )
}

// ---------------- Popup ----------------
function Popup({
  message,
  content,
  onClose,
}: {
  message?: string
  content?: React.ReactNode
  onClose: () => void
}) {
  if (!message && !content) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl bg-white text-neutral-900 px-8 py-6 shadow-2xl max-w-3xl w-full mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 text-neutral-500 hover:text-neutral-800"
          onClick={onClose}
        >
          ✕
        </button>

        {message && <p className="text-lg font-medium text-center text-vtk-blue">{message}</p>}

        {content}
      </motion.div>
    </div>
  )
}

// ---------------- PracticalInformation ----------------
function PracticalInformation({ page }: { page?: CareerEventPage }) {
  const lat = page?.location?.coordinates?.[1]
  const lng = page?.location?.coordinates?.[0]

  const getDirectionsUrl = lat && lng 
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : null

  return (
    <section id="events" className="relative border-t bg-white">
      <div className="relative mx-auto max-w-7xl px-4 py-16">
        <div className="mb-6 flex flex-col gap-6">
          <div className="text-2xl font-semibold tracking-tight md:text-3xl">Practical Information</div>

          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Location</h2>
              
              {/* Location Card */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                {page?.event.location && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-1">{page.event.location}</h3>
                  </div>
                )}
                
                <div className="space-y-4">
                  {page?.address && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        <MapPin className="h-5 w-5 text-vtk-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Address</div>
                        <div className="text-sm text-neutral-700 leading-relaxed">{page.address}</div>
                      </div>
                    </div>
                  )}
                  
                  {page?.parking && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        <Car className="h-5 w-5 text-vtk-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Parking</div>
                        <div className="text-sm text-neutral-700 leading-relaxed">{page.parking}</div>
                      </div>
                    </div>
                  )}
                </div>

                {getDirectionsUrl && (
                  <div className="mt-5 pt-4 border-t border-neutral-100">
                    <Button
                      asChild
                      variant="outline"
                      className="w-full rounded-full border-vtk-blue text-vtk-blue hover:bg-vtk-blue/5"
                    >
                      <a href={getDirectionsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Get Directions
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              {/* Map */}
              {lat && lng && (
                <div className="rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
                  <EventMap lat={lat} lng={lng} />
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-4">Timetable</h2>
              <div className="relative border-l-2 border-vtk-blue/30 pl-12">
                {page?.timetable?.map((item, index) => (
                  <div key={index} className="relative mb-10 last:mb-0">
                    <span className="absolute -left-7 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-vtk-yellow shadow-md">
                      {item.icon ? (
                        <HeroiconDynamic
                          name={item.icon}
                          className="w-5 h-5 text-black" // smaller + black
                        />
                      ) : (
                        <HeroiconDynamic
                          name={"star"}
                          className="w-5 h-5 text-black" // smaller + black
                        />
                      )}
                    </span>
                    <div className="flex items-center gap-3 mb-1 ml-6">
                      <span className="text-sm font-medium text-vtk-blue">{item.start_time} - {item.end_time}</span>
                    </div>
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 hover:shadow-lg transition-shadow duration-300">
                      <h3 className="font-semibold text-neutral-900">{item.title}</h3>
                      {item.description && (
                        <p className="text-neutral-700 mt-1 text-sm" dangerouslySetInnerHTML={{ __html: item.description }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

