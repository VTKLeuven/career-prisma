'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Calendar, Sparkles } from 'lucide-react'
import { getFileUrl } from "@/components/Images";
import { CareerEvent } from '@/lib/schema'
import type { UserSummary as AppUser } from "@/lib/schema";
import { ScrollCue } from '@/components/ScrollCue';
import { useBannerPage } from '@/hooks/use-banner-page';
import { getUpcomingEventsWithFallback } from '@/lib/utils/events';

/**
 * The homepage, with its events and team already loaded by the server page
 * (./page.tsx) -- it used to render empty and fetch /api/homepage three times.
 */
export function HomePageClient({ events, team }: { events: CareerEvent[]; team: AppUser[] }) {
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
                <AllEvents events={events} onBack={() => setViewAllEvents(false)} />
            ) : (
                <UpcomingEvents events={events} onViewAll={() => setViewAllEvents(true)} />
            )}
            <TeamOverview team={team} />
        </>
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
                    src="/api/files/1be725c7-bc66-47ba-b956-e7ae59978983"
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

function UpcomingEvents({ events, onViewAll }: { events: CareerEvent[]; onViewAll?: () => void }) {
    const prefetchedImagesRef = useRef<Set<string>>(new Set());

    // Filter and sort upcoming events, with past events fallback
    const upcomingEvents = getUpcomingEventsWithFallback(events, 3);

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
                      const imageUrl = event.image ? getFileUrl(event.image) : null
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
                                        src={getFileUrl(event.image)!}
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

function AllEvents({ events, onBack }: { events: CareerEvent[]; onBack?: () => void }) {

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

function TeamOverview({ team }: { team: AppUser[] }) {

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
                {team.map((m, i) => {
                  // Set per person in /admin/users. Rendering the card as a real
                  // anchor rather than an onClick keeps middle-click, keyboard
                  // focus and "open in new tab" working; without a link it stays
                  // a plain, unclickable card.
                  const link = m.profile_link || null;
                  const card = (
                    <div className="rounded-[28px] bg-white/90 p-5 text-center shadow-[0_10px_40px_rgba(11,77,140,0.08)] ring-1 ring-black/5 backdrop-blur-md hover:shadow-lg transition-shadow duration-200">
                      <div className="mx-auto h-24 w-24 overflow-hidden rounded-full ring-4 ring-vtk-light transition-transform duration-300 group-hover:scale-105">
                        {m.avatar && (
                          <Image
                            src={getFileUrl(m.avatar)!}
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
                  );

                  return (
                    <motion.li
                      key={m.id}
                      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                      whileHover={{ y: -4, rotate: i % 2 ? -0.8 : 0.8 }}
                      className="group relative"
                    >
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block cursor-pointer rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vtk-blue focus-visible:ring-offset-2"
                        >
                          {card}
                        </a>
                      ) : (
                        card
                      )}
                      <div
                        aria-hidden
                        className="absolute inset-x-8 -bottom-3 h-6 rounded-full bg-black/10 blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      />
                    </motion.li>
                  );
                })}
            </motion.ul>

            </div>
        </section>
    )
}

