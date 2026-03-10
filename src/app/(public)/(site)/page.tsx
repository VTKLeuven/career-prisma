'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, ChevronDown, Sparkles, LogOut, User, Star } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { fetchEventsAction } from "@/app/actions/events";
import { fetchSalespersonsAction } from "@/app/actions/salespeople";
import { getDirectusImageUrl } from "@/components/Images";
import { CareerEvent } from '@/lib/schema'
import { DirectusUser } from "@directus/sdk";
import { ScrollCue } from '@/components/ScrollCue';
import { useBannerPage } from '@/hooks/use-banner-page';
import { getUpcomingEventsWithFallback, type EventWithStatus } from '@/lib/utils/events';

export default function HomePage() {
    const [viewAllEvents, setViewAllEvents] = useState(false);
    useBannerPage();

    // Check for hash on mount and listen for view all events event
    useEffect(() => {
        const checkHash = () => {
            if (window.location.hash === '#all-events') {
                setViewAllEvents(true);
                // Scroll to events section after a short delay to ensure DOM is ready
                setTimeout(() => {
                    const eventsSection = document.getElementById('events');
                    if (eventsSection) {
                        eventsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            }
        };
        
        // Handler for custom event from header
        const handleViewAllEvents = () => {
            setViewAllEvents(true);
            setTimeout(() => {
                const eventsSection = document.getElementById('events');
                if (eventsSection) {
                    eventsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        };
        
        // Check immediately
        checkHash();
        
        // Also check after a short delay (in case page just loaded)
        const timeoutId = setTimeout(checkHash, 300);
        
        // Listen for hash changes
        window.addEventListener('hashchange', checkHash);
        
        // Listen for custom event from header (when on same page)
        window.addEventListener('viewAllEvents', handleViewAllEvents);
        
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('hashchange', checkHash);
            window.removeEventListener('viewAllEvents', handleViewAllEvents);
        };
    }, []);

    return (
        <>
            <Hero />
            {viewAllEvents ? (
                <AllEvents onBack={() => setViewAllEvents(false)} />
            ) : (
                <UpcomingEvents onViewAll={() => setViewAllEvents(true)} />
            )}
            <TeamOverview />
        </>
    )
}

function Header({ onViewAll }: { onViewAll?: () => void }) {
  const [openMenu, setOpenMenu] = useState<null | 'events'>(null)
  const [menuOpenedViaClick, setMenuOpenedViaClick] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [companyRep, setCompanyRep] = useState<{ authenticated: boolean; name: string } | null>(null)
  const [student, setStudent] = useState<{ authenticated: boolean; firstName: string | null; lastName: string | null } | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const [EVENTS, setEvents] = useState<CareerEvent[]>([]);
  const menuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const eventsMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
      const ac = new AbortController()

      const load = async () => {
        try {
          // Use API route for better caching
          const res = await fetch('/api/homepage', { signal: ac.signal })
          const data = (await res.json()) as { events?: CareerEvent[] }
          if (!ac.signal.aborted) setEvents(data.events ?? [])
        } catch {
          if (ac.signal.aborted) return
          // Fallback to direct action (must be caught too; navigation aborts can throw)
          try {
            const events = await fetchEventsAction()
            if (!ac.signal.aborted) setEvents(events)
          } catch {
            // Ignore: non-critical header data
          }
        }
      }

      load()
      return () => ac.abort()
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
        // Debug logging (remove in production)
        console.log('[Auth Check] API Response:', data);
        
        // Explicitly handle null/undefined - ensure we set null if API returns null or undefined
        // Only set companyRep if authenticated is explicitly true
        if (data?.companyRep?.authenticated === true) {
          console.log('[Auth Check] Setting companyRep:', data.companyRep);
          setCompanyRep(data.companyRep);
        } else {
          console.log('[Auth Check] No valid companyRep, setting to null');
          setCompanyRep(null);
        }
        
        // Only set student if authenticated is explicitly true
        if (data?.student?.authenticated === true) {
          console.log('[Auth Check] Setting student:', data.student);
          setStudent(data.student);
        } else {
          console.log('[Auth Check] No valid student, setting to null');
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
    // Check user authentication status on mount and when pathname changes
    // Add a small delay on mount to ensure cookies are read correctly
    const timer = setTimeout(() => {
      checkAuthStatus();
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
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
            {!student && companyRep && (
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
                    <DropdownMenuItem asChild>
                      <Link href="/student/liked-companies">
                        <Star className="mr-2 h-4 w-4 fill-amber-300 text-amber-400" />
                        Liked companies
                      </Link>
                    </DropdownMenuItem>
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
                        if (onViewAll) {
                          // On homepage, use callback directly
                          onViewAll();
                          // Scroll to events section
                          setTimeout(() => {
                            const eventsSection = document.getElementById('events');
                            if (eventsSection) {
                              eventsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }, 100);
                        } else {
                          // On other pages, navigate to homepage with hash
                          router.push('/#all-events');
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
                  {!student && companyRep && (
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
                          <DropdownMenuItem asChild>
                            <Link href="/student/liked-companies" onClick={() => setMobileMenuOpen(false)}>
                              <Star className="mr-2 h-4 w-4 fill-amber-300 text-amber-400" />
                              Liked companies
                            </Link>
                          </DropdownMenuItem>
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
                        if (onViewAll) {
                          // On homepage, use callback directly
                          onViewAll();
                          // Scroll to events section
                          setTimeout(() => {
                            const eventsSection = document.getElementById('events');
                            if (eventsSection) {
                              eventsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }, 100);
                        } else {
                          // On other pages, navigate to homepage with hash
                          router.push('/#all-events');
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

function Hero() {
    const ref = useRef<HTMLElement | null>(null)
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });
    const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"])

    return (
        <section ref={ref} className="relative isolate overflow-hidden border-b min-h-[60vh] sm:min-h-[72vh] md:min-h-[82vh] -mt-2 pt-16 sm:pt-20 md:pt-24">
            <motion.div aria-hidden className="absolute inset-0" style={{ y }}>
                <Image
                    src="https://directustest.vtk.be/assets/1be725c7-bc66-47ba-b956-e7ae59978983.jpg"
                    alt="VTK Career events crowd"
                    fill
                    priority
                    fetchPriority="high"
                    loading="eager"
                    sizes="100vw"
                    className="object-cover"
                />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/25" />
            <div className="pointer-events-none absolute -left-16 top-24 h-24 w-24 -rotate-6 rounded-2xl bg-vtk-yellow/70 blur-xl" />
            <div className="pointer-events-none absolute right-[-30px] bottom-20 h-28 w-28 rotate-6 rounded-2xl bg-vtk-light/80 blur-xl" />

            <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 sm:gap-10 px-4 pt-20 sm:pt-28 md:pt-36 pb-12 sm:pb-16 md:pb-24">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs text-white">
                        <Sparkles className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Organiser of the biggest engineering fair in the BeNeLux</span><span className="sm:hidden">BeNeLux&apos;s biggest engineering fair</span>
                    </div>
                    <h1 className="text-balance text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.1] tracking-tight text-white">
                        Last year we welcomed <span className='text-vtk-yellow'>300 companies</span> and <span className='text-vtk-yellow'>3000 students</span> at our VTK Career Events
                    </h1>
                    <p className="mt-4 md:mt-5 max-w-2xl text-pretty text-sm sm:text-base text-white/90 md:text-lg">
                        Can we welcome you this year (too)?
                    </p>
                    <div className="mt-6 md:mt-10 flex flex-wrap items-center gap-3">
                        <Button asChild variant="ghost" className="rounded-full bg-vtk-yellow text-black hover:brightness-95 text-sm sm:text-base">
                            <Link href="#events">Explore events</Link>
                        </Button>
                        <Button asChild variant="ghost" className="rounded-full bg-vtk-blue-dark text-white hover:brightness-95 text-sm sm:text-base">
                            <Link href="#team">Meet the team</Link>
                        </Button>
                    </div>
                </motion.div>
            </div>

            <ScrollCue />
        </section>
    )
}

function UpcomingEvents({ onViewAll }: { onViewAll?: () => void }) {
    const [EVENTS, setEvents] = useState<CareerEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const prefetchedImagesRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        let alive = true;
        // Use API route for better caching
        fetch('/api/homepage')
          .then(res => res.json())
          .then((data) => { 
            if (!alive) return; 
            setEvents(data.events ?? []); 
          })
          .catch(() => {
            // Fallback to direct action
            return fetchEventsAction()
              .then((rows) => { if (!alive) return; setEvents(rows ?? []); })
              .catch((err) => console.error("Error fetching events:", err));
          })
          .finally(() => setLoading(false));
        return () => { alive = false; };
    }, []);

    // Filter and sort upcoming events, with past events fallback
    const upcomingEvents = getUpcomingEventsWithFallback(EVENTS, 3);

    if (loading) return <section id="events" className="py-16 text-center"><p className="text-sm text-muted-foreground">Loading events…</p></section>;

    return (
        <section id="events" className="relative border-t bg-white">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_30%_at_10%_10%,rgba(14,77,140,0.05),transparent),radial-gradient(40%_30%_at_90%_20%,rgba(255,210,0,0.08),transparent)]" />
            <div className="relative mx-auto max-w-7xl px-4 py-16">
                <div className="mb-6 flex items-end justify-between gap-4 md:flex-row flex-col">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Upcoming events</h2>
                    </div>
                    <Button variant="outline" className="hidden md:inline-flex rounded-full border-vtk-blue text-vtk-blue hover:bg-vtk-blue/5" onClick={onViewAll}>
                        All events
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {upcomingEvents.map((event, i) => {
                      const imageUrl = event.image ? getDirectusImageUrl(event.image) : null
                      const isPast = event.isPast ?? false
                      return (
                        <motion.div
                            key={event.name}
                            whileHover={isPast ? {} : { y: -8, rotate: i % 2 ? -1 : 1 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                            className={`group relative block ${isPast ? 'opacity-60 grayscale' : ''}`}
                            onMouseEnter={() => {
                              // Prefetch image on hover for faster navigation.
                              // Avoid touching <head>: Next/React head management can break if we append nodes manually.
                              if (!imageUrl || typeof window === 'undefined') return;

                              // Debounce to avoid too many requests
                              setTimeout(() => {
                                if (prefetchedImagesRef.current.has(imageUrl)) return;
                                prefetchedImagesRef.current.add(imageUrl);

                                // Warm the browser cache without mutating the DOM tree.
                                const img = new window.Image();
                                img.decoding = 'async';
                                img.src = imageUrl;
                              }, 300);
                            }}
                        >
                            <Link
                                href={event.href ?? '#'}
                                prefetch={true}
                                className="block"
                            >
                            <div className="rounded-[28px] bg-white/90 p-3 shadow-[0_10px_40px_rgba(11,77,140,0.08)] ring-1 ring-black/5 backdrop-blur-md">
                                <div className="relative overflow-hidden rounded-[20px]">
                                    <div className="relative aspect-[4/3]">
                                      {event.image && (
                                      <Image
                                        src={getDirectusImageUrl(event.image)!}
                                        alt={event.name}
                                        fill 
                                        priority={i < 3} // Priority for first 3 images
                                        fetchPriority={i < 3 ? "high" : "auto"}
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                      />
                                      )}
                                    </div>
                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                    {event.shout ? <span className="absolute left-3 top-3 rounded-full bg-vtk-yellow px-2 py-0.5 text-xs font-bold text-black shadow-sm">{event.shout}</span> : null}
                                </div>
                                <div className="px-2 pb-2 pt-3">
                                    <div className="text-base font-semibold tracking-tight text-neutral-900">{event.name}</div>
                                    <div className="mt-1 flex items-center gap-2 text-sm text-neutral-700">
                                        <Calendar className="h-4 w-4 text-vtk-blue" />
                                        <span>{event.date} · {event.location}</span>
                                    </div>
                                </div>
                            </div>
                            <div aria-hidden className="absolute inset-x-6 -bottom-3 h-6 rounded-full bg-black/10 blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                            </Link>
                        </motion.div>
                      )
                    })}
                </div>

                {/* All events button - below cards on mobile only */}
                <div className="mt-6 flex justify-center md:hidden">
                    <Button variant="outline" className="w-full rounded-full border-vtk-blue text-vtk-blue hover:bg-vtk-blue/5" onClick={onViewAll}>
                        All events
                    </Button>
                </div>
            </div>
        </section>
    )
}

function AllEvents({ onBack }: { onBack?: () => void }) {
  const [events, setEvents] = useState<CareerEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use API route for better caching
    fetch('/api/homepage')
      .then(res => res.json())
      .then((data) => setEvents(data.events ?? []))
      .catch(() => {
        // Fallback to direct action
        return fetchEventsAction()
          .then((rows) => setEvents(rows ?? []))
          .catch((err) => console.error("Error fetching events:", err));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <section id="events" className="py-16 text-center"><p className="text-sm text-muted-foreground">Loading all events…</p></section>;

  return (
    <section id="events" className="relative border-t bg-white">
      <div className="relative mx-auto max-w-7xl px-4 py-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">All Events</h2>
          <Button variant="outline" className="rounded-full border-vtk-blue text-vtk-blue hover:bg-vtk-blue/5" onClick={() => {
            onBack?.();
            // Remove hash from URL when going back
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }}>
            Back
          </Button>
        </div>

        <ul className="divide-y divide-neutral-200 border rounded-2xl bg-white/90 shadow-sm">
          {events.map((event) => (
            <li key={event.name}>
              <Link href={event.href ?? '#'} className="block px-5 py-4 hover:bg-vtk-light/40 transition">
                <div className="font-medium text-neutral-900">{event.name}</div>
                <div className="text-sm text-neutral-600">{event.date} · {event.location}</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function TeamOverview() {
    const [team, setTeam] = useState<DirectusUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let alive = true;
      // Use API route for better caching (shares cache with events)
      fetch('/api/homepage')
        .then(res => res.json())
        .then((data) => { 
          if (!alive) return; 
          setTeam(data.salespersons ?? []); 
        })
        .catch(() => {
          // Fallback to direct action
          return fetchSalespersonsAction()
            .then((rows) => { if (!alive) return; setTeam(rows ?? []); })
            .catch((err) => console.error("Error fetching salespersons:", err));
        })
        .finally(() => setLoading(false));
      return () => { alive = false; };
    }, []);

    if (loading) return <section id="events" className="py-16 text-center"><p className="text-sm text-muted-foreground">Loading salespersons</p></section>;

    return (
        <section id="team" className="relative border-t bg-white">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_30%_at_10%_90%,rgba(255,210,0,0.08),transparent),radial-gradient(40%_30%_at_90%_10%,rgba(14,77,140,0.06),transparent)]" />

            <div className="relative mx-auto max-w-7xl px-4 py-16">
                <div className="mb-2">
                    <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Team overview</h2>
                    <p className="mt-2 max-w-2xl text-neutral-600">Friendly faces you’ll meet at our events.</p>
                </div>

                <motion.ul
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                  className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-5"
                >
                {team.map((m, i) => (
                  <motion.li
                    key={m.id}
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    whileHover={{ y: -4, rotate: i % 2 ? -0.8 : 0.8 }}
                    className="group relative cursor-pointer"
                    onClick={() => { if (m.description) window.open(m.description, "_blank"); }}
                  >
                  <div className="rounded-[28px] bg-white/90 p-5 text-center shadow-[0_10px_40px_rgba(11,77,140,0.08)] ring-1 ring-black/5 backdrop-blur-md hover:shadow-lg transition-shadow duration-200">
                  <div className="mx-auto h-24 w-24 overflow-hidden rounded-full ring-4 ring-vtk-light transition-transform duration-300 group-hover:scale-105">
                  {m.avatar && (
                    <Image
                    src={getDirectusImageUrl(m.avatar)!}
                    alt={`${m.first_name} ${m.last_name}`}
                    width={96}
                    height={96}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  )}
                  </div>
                  <div className="mt-3 text-base font-semibold tracking-tight text-neutral-900">
                  {m.first_name} {m.last_name}
                  </div>
                  <div className="mt-1 text-xs font-medium text-vtk-blue/90">{m.title}</div>
                </div>
                <div
                aria-hidden
                className="absolute inset-x-8 -bottom-3 h-6 rounded-full bg-black/10 blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                />
            </motion.li>
            ))}
            </motion.ul>

            </div>
        </section>
    )
}


