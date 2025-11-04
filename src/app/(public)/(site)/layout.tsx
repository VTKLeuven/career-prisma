"use client"

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { fetchEventsAction } from "@/app/actions/events";
import { CareerEvent } from '@/lib/schema'


export default function NoSidebarLayout({ children }: { children: React.ReactNode }) {
    // simple shell without sidebar/header
    return <main className="min-h-svh bg-vtk-bg text-neutral-900">
        <Header />
        {children}</main>
}


function Header() {
  const [openMenu, setOpenMenu] = useState<null | 'events'>(null)
  const router = useRouter()
  const [EVENTS, setEvents] = useState<CareerEvent[]>([]);

    useEffect(() => {
        fetchEventsAction().then(setEvents);
    }, []);

  return (
    <header
      onKeyDown={(e) => e.key === 'Escape' && setOpenMenu(null)}
      className="fixed top-4 inset-x-0 z-50 w-full"
      aria-label="Site navigation"
    >
      <div className="mx-auto max-w-7xl px-4">
        {/* Floating island */}
        <div className="flex items-center justify-between gap-3 rounded-2xl -mx-8 border bg-white/85 px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.10)] ring-1 ring-black/5 backdrop-blur-md md:px-5 md:py-3">
          {/* Left: logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2 rounded-full px-2">
            {/* <div className="relative h-9 w-9 overflow-hidden rounded-full border bg-vtk-light" /> */}
            <span className="hidden text-sm font-semibold tracking-tight text-vtk-blue sm:block">VTK Career</span>
          </Link>

          {/* Middle: primary nav */}
          <nav className="hidden items-center gap-2 md:flex">
            <Link href="#" className="rounded-full bg-vtk-blue px-4 py-2 text-sm font-medium text-white">Home</Link>

            {/* Events mega trigger */}
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

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-2">
            {/* icon pills */}
            {/* <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white text-neutral-700 hover:bg-neutral-100">
              <ShoppingCart className="h-5 w-5" />
            </button>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white text-neutral-700 hover:bg-neutral-100">
              <Search className="h-5 w-5" />
            </button> */}

            {/* <div className="hidden items-center gap-2 rounded-full border bg-white px-3 py-2 text-sm text-neutral-700 lg:flex">
              <Globe className="h-4 w-4" /> English (US) <ChevronDown className="h-4 w-4" />
            </div> */}

            <Button variant="outline" className="hidden rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 md:inline-flex cursor-pointer" onClick={() => router.push("/dashboard")}>Company Dashboard</Button>
            <Button asChild className="rounded-full bg-vtk-blue hover:bg-vtk-blueDark"><Link href="#contact">Contact Us</Link></Button>
          </div>
        </div>
      </div>

      {/* FULL-WIDTH mega panel anchored to the header, not the nav item */}
      <AnimatePresence>
        {openMenu === 'events' && (
          <motion.div
            id="mega-events"
            key="mega"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-50"
            onMouseEnter={() => setOpenMenu('events')}
            onMouseLeave={() => setOpenMenu(null)}
          >
            {/* center the panel and make its background match the island width only */}
            <div className="mx-auto max-w-7xl px-4">
              <div className="rounded-2xl border bg-white/85 backdrop-blur-md shadow-xl -mx-8">
                <div className="grid grid-cols-1 gap-8 px-4 py-8 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-neutral-900">Upcoming events</h3>
                      <Button asChild size="sm" variant="outline" className="rounded-full border-vtk-blue text-vtk-blue hover:bg-vtk-blue/5">
                        <Link href="#">View all</Link>
                      </Button>
                    </div>
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {EVENTS.slice(0, 8).map((event) => (
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