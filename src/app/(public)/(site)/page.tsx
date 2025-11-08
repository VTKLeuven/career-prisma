'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Calendar, ChevronDown, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { fetchEventsAction } from "@/app/actions/events";
import { fetchSalespersonsAction } from "@/app/actions/salespeople";
import { getDirectusImageUrl } from "@/components/Images";
import { CareerEvent } from '@/lib/schema'
import { DirectusUser } from "@directus/sdk";
import { ScrollCue } from '@/components/ScrollCue';

export default function HomePage() {
    const [viewAllEvents, setViewAllEvents] = useState(false);

    return (
        <main className="min-h-svh bg-vtk-bg text-neutral-900">
            <Header onViewAll={() => setViewAllEvents(true)} />
            <Hero />
            {viewAllEvents ? (
                <AllEvents onBack={() => setViewAllEvents(false)} />
            ) : (
                <UpcomingEvents onViewAll={() => setViewAllEvents(true)} />
            )}
            <TeamOverview />
            <Footer />
        </main>
    )
}

function Header({ onViewAll }: { onViewAll?: () => void }) {
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
            <Link href="#" className="rounded-full bg-vtk-blue px-4 py-2 text-sm font-medium text-white">Home</Link>

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

            <Link href="#students" className="rounded-full px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100">Services</Link>
          </nav>

          {/* Mobile nav - Events as simple button */}
          <nav className="md:hidden flex items-center gap-2">
            <Link href="#" className="rounded-full bg-vtk-blue px-3 py-1.5 text-xs font-medium text-white">Home</Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100"
            >
              Events
            </button>
            <Link href="#students" className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100">Services</Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className="hidden rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 md:inline-flex cursor-pointer" onClick={() => router.push("/dashboard")}>Company Dashboard</Button>
            <Button asChild className="hidden rounded-full bg-vtk-blue hover:bg-vtk-blueDark md:inline-flex"><Link href="#contact">Contact Us</Link></Button>
            
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
                        onViewAll?.();
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
                    <Link href="#contact">Contact Us</Link>
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
                          onViewAll?.();
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
                        <Button className="rounded-full bg-vtk-blue hover:bg-vtk-blueDark">Explore jobfair</Button>
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

    useEffect(() => {
        let alive = true;
        fetchEventsAction()
          .then((rows) => { if (!alive) return; setEvents(rows ?? []); })
          .catch((err) => console.error("Error fetching events:", err))
          .finally(() => setLoading(false));
        return () => { alive = false; };
    }, []);

    // Filter and sort upcoming events
    const upcomingEvents = EVENTS
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
      .slice(0, 3);

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
                    {upcomingEvents.map((event, i) => (
                        <motion.a
                            key={event.name}
                            href={event.href ?? '#'}
                            whileHover={{ y: -8, rotate: i % 2 ? -1 : 1 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                            className="group relative block"
                        >
                            <div className="rounded-[28px] bg-white/90 p-3 shadow-[0_10px_40px_rgba(11,77,140,0.08)] ring-1 ring-black/5 backdrop-blur-md">
                                <div className="relative overflow-hidden rounded-[20px]">
                                    <div className="aspect-[4/3]">
                                      {event.image && (
                                      <Image
                                        src={getDirectusImageUrl(event.image)!}
                                        alt={event.name}
                                        fill className="object-cover transition-transform duration-300 group-hover:scale-105"
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
                        </motion.a>
                    ))}
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
    fetchEventsAction()
      .then((rows) => setEvents(rows ?? []))
      .catch((err) => console.error("Error fetching events:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <section className="py-16 text-center"><p className="text-sm text-muted-foreground">Loading all events…</p></section>;

  return (
    <section className="relative border-t bg-white">
      <div className="relative mx-auto max-w-7xl px-4 py-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">All Events</h2>
          <Button variant="outline" className="rounded-full border-vtk-blue text-vtk-blue hover:bg-vtk-blue/5" onClick={onBack}>
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
      fetchSalespersonsAction()
        .then((rows) => { if (!alive) return; setTeam(rows ?? []); })
        .catch((err) => console.error("Error fetching salespersons:", err))
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

function Footer() {
    return (
        <footer id="contact" className="bg-white">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="relative h-8 w-8 overflow-hidden rounded-xl border bg-vtk-light" />
                            <span className="font-semibold text-vtk-blue">VTK Career Hub</span>
                        </div>
                        <p className="max-w-xs text-sm text-neutral-700">The all-in-one platform for engineering students looking for a job.</p>
                    </div>

                    <div>
                        <h4 className="mb-3 text-sm font-medium text-neutral-900">Explore</h4>
                        <ul className="space-y-2 text-sm text-neutral-700">
                            <li><Link href="#events" className="hover:text-vtk-blue hover:underline underline-offset-4">Events</Link></li>
                            <li><Link href="#team" className="hover:text-vtk-blue hover:underline underline-offset-4">Team</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="mb-3 text-sm font-medium text-neutral-900">For partners</h4>
                        <ul className="space-y-2 text-sm text-neutral-700">
                            <li><Link href="#" className="hover:text-vtk-blue hover:underline underline-offset-4">Sponsor</Link></li>
                            <li><Link href="#" className="hover:text-vtk-blue hover:underline underline-offset-4">Job postings</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="mb-3 text-sm font-medium text-neutral-900">Get in touch</h4>
                        <ul className="space-y-2 text-sm text-neutral-700">
                            <li><Link href="mailto:career@vtk.be" className="hover:text-vtk-blue hover:underline underline-offset-4">career@vtk.be</Link></li>
                        </ul>
                    </div>
                </div>

                <Separator className="my-10" />

                <div className="flex flex-col items-start justify-between gap-4 text-xs text-neutral-600 sm:flex-row sm:items-center">
                    <p>© {new Date().getFullYear()} Career Hub. All rights reserved.</p>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <Link href="#" className="hover:text-vtk-blue">Privacy</Link>
                        <Link href="#" className="hover:text-vtk-blue">Terms</Link>
                        <Link href="#" className="hover:text-vtk-blue">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}

