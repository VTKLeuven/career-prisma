'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ScrollCue } from '@/components/ScrollCue'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from "next/navigation"
import { fetchEventPagesAction, fetchEventsAction } from "@/app/actions/events"
import { getDirectusImageUrl } from "@/components/Images";
import { CareerEventPage, Company, CareerEvent } from '@/lib/schema'
import dynamic from "next/dynamic"
import HeroiconDynamic from "@/components/HeroiconDynamic"
import { ChevronDown } from 'lucide-react'
import { useBannerPage } from '@/hooks/use-banner-page'
import { usePageLayout } from '../../layout'

const EventMap = dynamic(() => import("@/components/EventMap").then(mod => mod.EventMap), {
  ssr: false,
})

export default function EventPage() {
  const { setHideLayoutHeader } = usePageLayout()
  const [page, setPage] = useState<CareerEventPage | null>(null)
  const [popupMessage, setPopupMessage] = useState<string>("")
  const [popupContent, setPopupContent] = useState<React.ReactNode>(null)
  useBannerPage()

  const params = useParams()
  const eventName = Array.isArray(params.eventName)
  ? params.eventName[0]
  : params.eventName

  // Fetch events and find the correct page
  const loadedEventRef = useRef<string | null>(null)

  useEffect(() => {
    // Skip if no eventName
    if (!eventName) return

    // Prevent duplicate loads of the same event
    if (loadedEventRef.current === eventName) {
      return
    }

    // Mark as loading BEFORE async operation
    loadedEventRef.current = eventName

    async function load() {
      try {
        const events = await fetchEventPagesAction()

        // Verify we're still loading the same event
        if (loadedEventRef.current !== eventName) return

        const found = events.find(
          (p) => p.event?.name && p.event.name.toLowerCase().replace(/\s+/g, "-") === eventName
        )
        setPage(found ?? null)
      } catch (error) {
        console.error('Error loading event page:', error)
        // Reset ref on error so we can retry
        if (loadedEventRef.current === eventName) {
          loadedEventRef.current = null
        }
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
    return () => setHideLayoutHeader(false)
  }, [setHideLayoutHeader])

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const [EVENTS, setEvents] = useState<CareerEvent[]>([]);
  const menuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const eventsMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchEventsAction().then(setEvents);
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
            <span className="text-xs sm:text-sm font-semibold tracking-tight text-vtk-blue">VTK Career</span>
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
            <Button variant="outline" className="hidden rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 md:inline-flex cursor-pointer" onClick={() => router.push("/dashboard")}>Company Dashboard</Button>
            <Button asChild className="hidden rounded-full bg-vtk-blue hover:bg-vtk-blueDark md:inline-flex"><Link href="/contact">Contact Us</Link></Button>

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
                        // Navigate to homepage with hash
                        window.location.href = '/#all-events';
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
                          const now = new Date();
                          return eventDate > now;
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
                    variant="outline"
                    className="rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 w-full"
                    onClick={() => {
                      router.push("/dashboard");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Company Dashboard
                  </Button>
                  <Button
                    asChild
                    className="rounded-full bg-vtk-blue hover:bg-vtk-blueDark w-full"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/contact">Contact Us</Link>
                  </Button>
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
                          // Navigate to homepage with hash
                          window.location.href = '/#all-events';
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
                            const now = new Date();
                            return eventDate > now;
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
            <span className="text-xs sm:text-sm font-semibold tracking-tight text-vtk-blue">VTK Career</span>
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
                <Link
                  href={`/event/${page.event.name.toLowerCase().replace(/\s+/g, "-")}/matching-software`}
                  className="rounded-full px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
                >
                  Matching Software
                </Link>
              </>
            )}
          </nav>

export const revalidate = 300; // Revalidate every 5 minutes
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
                <Link
                  href={`/event/${page.event.name.toLowerCase().replace(/\s+/g, "-")}/matching-software`}
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-100 whitespace-nowrap shrink-0"
                >
                  Matching
                </Link>
              </>
            )}
          </nav>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Button variant="outline" className="hidden rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 md:inline-flex cursor-pointer" onClick={() => router.push("/dashboard")}>Company Dashboard</Button>
            <Button asChild className="hidden rounded-full bg-vtk-blue hover:bg-vtk-blueDark md:inline-flex"><Link href="/contact">Contact Us</Link></Button>

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

      {/* Mobile Menu - Only Company Dashboard and Contact Us */}
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
                  <Button
                    variant="outline"
                    className="rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 w-full"
                    onClick={() => {
                      router.push("/dashboard");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Company Dashboard
                  </Button>
                  <Button
                    asChild
                    className="rounded-full bg-vtk-blue hover:bg-vtk-blueDark w-full"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/contact">Contact Us</Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventName: string }>;
}) {
  const { eventName } = await params;

  // Fetch data on the server for faster initial load
  const page = await fetchEventPageBySlugAction(eventName);

  if (!page) {
    notFound();
  }

  // Pass data to client component
  return <EventPageClient initialPage={page} eventName={eventName} />;
      {/* Text - Mobile: bottom aligned with more padding, Desktop: original position */}
      <div className="absolute inset-x-0 bottom-0 md:top-4/7 md:bottom-auto pb-6 sm:pb-4 md:pb-0 md:-translate-y-1/2">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {page?.event ? (
              <>
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
              </>
            ) : (
              <h1 className="text-2xl sm:text-3xl text-white">Loading event...</h1>
            )}

            <div className="mt-5 sm:mt-6 md:mt-10 flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Register button */}
              <Button
                variant="ghost"
                className="rounded-full bg-vtk-yellow text-black hover:brightness-95 cursor-pointer text-sm sm:text-base"
                onClick={handleRegisterClick}
              >
                Register
              </Button>

              {/* Floorplan button (if floorplan exists) or Explore companies button */}
              {page?.floorplan ? (
                <Button
                  variant="ghost"
                  asChild
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
        </div>
      </div>

      <ScrollCue />
    </section>
  )
}
