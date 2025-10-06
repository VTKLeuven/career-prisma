'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ScrollCue } from '../page'
import { Calendar } from 'lucide-react'
import * as LucideIcons from "lucide-react";
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from "next/navigation"
import { fetchEventPagesAction } from "@/app/actions/events"
import { getDirectusImageUrl } from "@/lib/repos/directus"
import { CareerEventPage } from '@/lib/schema'

export default function EventPage() {
  const [EVENTS, setEVENTS] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const eventName = searchParams.get("name");

  useEffect(() => {
    fetchEventPagesAction().then(setEVENTS);
  }, []);

  // Find the event whose event.name matches the query param
  const page = EVENTS.find(
    (p) => p.event?.name?.toLowerCase() === eventName?.toLowerCase()
  );
  console.log(page)

  return (
    <>
      <Hero page={page} />
      <PracticalInformation page={page} />
    </>
  );
}

function Hero({ page }: { page?: CareerEventPage }) {
    const ref = useRef<HTMLElement | null>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });
    const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

    return (
        <section
            ref={ref}
            className="relative isolate overflow-hidden border-b min-h-[72vh] md:min-h-[82vh] -mt-2"
        >
            {/* background image with parallax */}
            <motion.div aria-hidden className="absolute inset-0" style={{ y }}>
                <Image
                    src={
                        getDirectusImageUrl(page?.event.image) ??
                        "https://directustest.vtk.be/assets/1be725c7-bc66-47ba-b956-e7ae59978983.jpg"
                    }
                    alt={page?.event.name ?? "VTK Career events crowd"} // TODO: FIX ALT
                    fill
                    priority
                    className="object-cover"
                />
            </motion.div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/45 to-black/25" />

            {/* text content pinned at bottom */}
            <div className="absolute inset-x-0 top-4/7">
            <div className="mx-auto max-w-7xl px-4 -translate-y-1/2">
                <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                >
                {page?.event ? (
                    <>
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs text-white">
                        {page.tagline ?? "Biggest engineering jobfair in the BeNeLux for students"}
                    </div>
                    <h1 className="text-balance text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight text-white">
                        {page.event.name}
                    </h1>
                    <p className="max-w-2xl font-black text-white/90 md:text-xl mt-2 uppercase">
                        {page.event.date} – {page.event.location}
                    </p>
                    <div
                        className="prose prose-invert max-w-2xl text-white/90 md:text-lg mt-4"
                        dangerouslySetInnerHTML={{ __html: page.description_EN }}
                    />
                    </>
                ) : (
                    <h1 className="text-3xl text-white">Loading event...</h1>
                )}

                <div className="mt-10 flex flex-wrap items-center gap-3">
                    <Button asChild variant="ghost" className="rounded-full bg-vtk-yellow text-black hover:brightness-95">
                    <Link href="#events">Register</Link>
                    </Button>
                    <Button asChild variant="ghost" className="rounded-full bg-vtk-blue-dark text-white hover:brightness-95">
                    <Link href="#team">Explore companies</Link>
                    </Button>
                </div>
                </motion.div>
            </div>
            </div>


            <ScrollCue />
        </section>
    );
}

function PracticalInformation({ page }: { page?: CareerEventPage }) {
  return (
    <section id="events" className="relative border-t bg-white">
      <div className="relative mx-auto max-w-7xl px-4 py-16">
        <div className="mb-6 flex flex-col gap-6">
          <div className="text-2xl font-semibold tracking-tight md:text-3xl">
            Practical Information
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Location */}
            <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-4">Location</h2>
              <p className="text-neutral-700 mb-2">
                VTK Headquarters, Leuven, Belgium
              </p>
              <p className="text-neutral-700 mb-2">
                Address: Example Street 123, 3000 Leuven
              </p>
              <p className="text-neutral-700">
                Public transport: Take bus X or train Y to Leuven Central Station.
              </p>
            </div>

            {/* Timetable / Timeline */}
            <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-4">Timetable</h2>
              <div className="relative border-l-2 border-vtk-blue/30 pl-12">
                {page?.timetable?.map((item, index) => (
                  <div key={index} className="relative mb-10 last:mb-0">
                    {/* Big yellow dot */}
                    <span className="absolute -left-7 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-vtk-yellow text-xl shadow-md">
                      {item.icon || "⭐"} {/* fallback emoji */}
                    </span>

                    {/* Time label */}
                    <div className="flex items-center gap-3 mb-1 ml-6">
                      <span className="text-sm font-medium text-vtk-blue">
                        {item.start_time} - {item.end_time}
                      </span>
                    </div>

                    {/* Content box */}
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 hover:shadow-lg transition-shadow duration-300">
                      <h3 className="font-semibold text-neutral-900">{item.title}</h3>
                      {item.description && (
                        <p
                          className="text-neutral-700 mt-1 text-sm"
                          dangerouslySetInnerHTML={{ __html: item.description }}
                        />
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
  );
}
