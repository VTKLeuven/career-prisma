"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, createContext, useContext, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { fetchEventsAction } from "@/app/actions/events";
import { CareerEvent } from '@/lib/schema'
import { Footer } from '@/components/Footer'

// Context to allow pages to opt-out of header padding if they have a banner
// and to hide the layout header if they render their own
const PageLayoutContext = createContext<{
  hasBanner: boolean
  setHasBanner: (hasBanner: boolean) => void
  hideLayoutHeader: boolean
  setHideLayoutHeader: (hide: boolean) => void
}>({
  hasBanner: false,
  setHasBanner: () => {},
  hideLayoutHeader: false,
  setHideLayoutHeader: () => {},
})

export const usePageLayout = () => useContext(PageLayoutContext)

export default function NoSidebarLayout({ children }: { children: React.ReactNode }) {
    const [hasBanner, setHasBanner] = useState(false)
    const [hideLayoutHeader, setHideLayoutHeader] = useState(false)

    // simple shell without sidebar/header
    // Apply padding only if page doesn't have a banner and layout header is shown
    return (
        <PageLayoutContext.Provider value={{ hasBanner, setHasBanner, hideLayoutHeader, setHideLayoutHeader }}>
            <main className={`min-h-svh bg-vtk-bg text-neutral-900 ${hasBanner || hideLayoutHeader ? '' : 'pt-28 md:pt-32'}`}>
                {!hideLayoutHeader && <Header />}
                {children}
                <Footer />
            </main>
        </PageLayoutContext.Provider>
    )
}


function Header() {
  const [openMenu, setOpenMenu] = useState<null | 'events'>(null)
  const [menuOpenedViaClick, setMenuOpenedViaClick] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
