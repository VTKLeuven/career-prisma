'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ScrollCue } from '../page'
import { Calendar } from 'lucide-react'

const EVENTS = [
    {
        title: 'BR Launch',
        date: 'Oct 2, 2025',
        location: 'Quadrivium, Campus Arenberg',
        href: '#',
        img: 'https://directustest.vtk.be/assets/d8d61544-4c89-4eba-ba52-ae337fb5778f.jpg',
        shout: "Kick-Off The Year"
    },
    {
        title: 'Sector Night Construction & Architecture',
        date: 'Oct 10, 2025',
        location: 'Quadrivium, Campus Arenberg',
        href: '#',
        img: 'https://directustest.vtk.be/assets/a1c0e6ec-c517-4ff6-88ee-7dd5fa50ba65.jpg',
    },
    {
        title: 'Internship Fair',
        date: 'Nov 29, 2025',
        location: 'OHL Business Seats',
        href: '#',
        img: 'https://directustest.vtk.be/assets/8b282af3-9c94-4e5d-bbb4-6571e7715e3d.jpg',
    },
    {
        title: 'VTK Jobfair Leuven',
        date: 'Mar 12, 2026',
        location: 'Brabanthal, Leuven',
        href: '#',
        img: 'https://directustest.vtk.be/assets/1be725c7-bc66-47ba-b956-e7ae59978983.jpg',
    },
]

export default function EventPage() {
    return <>
        <Hero />
        <PracticalInformation />
    </>
}

function Hero() {
    const ref = useRef<HTMLElement | null>(null)
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });
    const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]) // subtle parallax

    console.log(process.env)

    return (

        <section
            ref={ref}
            className="relative isolate overflow-hidden border-b min-h-[72vh] md:min-h-[82vh] -mt-2"
        >
            {/* background image with parallax */}
            <motion.div aria-hidden className="absolute inset-0" style={{ y }}>
                <Image
                    src="https://directustest.vtk.be/assets/1be725c7-bc66-47ba-b956-e7ae59978983.jpg"
                    alt="VTK Career events crowd"
                    fill
                    priority
                    className="object-cover"
                />
            </motion.div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/45 to-black/25" />
            {/* <div className="pointer-events-none absolute -left-16 top-24 h-24 w-24 -rotate-6 rounded-2xl bg-vtk-yellow/70 blur-xl" /> */}
            {/* <div className="pointer-events-none absolute right-[-30px] bottom-20 h-28 w-28 rotate-6 rounded-2xl bg-vtk-light/80 blur-xl" /> */}

            {/* text content pinned at bottom */}
            <div className="absolute inset-x-0 bottom-0">
                <div className="mx-auto max-w-7xl px-4 pb-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs text-white">
                            Biggest engineering jobfair in the BeNeLux for students
                        </div>
                        <h1 className="text-balance text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight text-white">
                            VTK Jobfair
                        </h1>
                        <p className="max-w-2xl font-black text-white/90 md:text-xl mt-2 uppercase">
                            12 march 2026 - BRABANTHAL
                        </p>
                        <p className="max-w-2xl text-pretty text-base text-white/90 md:text-lg mt-4">
                            The VTK Jobfair is the largest recruitment fair for engineers in the BeNeLux. It is an open-house fair where engineering students from all around Leuven come to explore the job market in their domain and meet their future employer. Apart from the students of the Faculty of Engineering Science, we also welcome a lot of industrial, economic and bioengineering students, making the VTK Jobfair the best place to meet engineering profiles from KU Leuven and its surroundings.
                        </p>
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

            {/* playful scroll cue */}
            <ScrollCue />
        </section>

    )
}

function PracticalInformation() {
    return (
        <section id="events" className="relative border-t bg-white">
            <div className="relative mx-auto max-w-7xl px-4 py-16">
                <div className="mb-6 flex flex-col gap-6">
                    <div className="text-2xl font-semibold tracking-tight md:text-3xl">Practical Information</div>
                    {/* <Button asChild variant="outline" className="hidden rounded-full border-vtk-blue text-vtk-blue hover:bg-vtk-blue/5 md:inline-flex"><Link href="#">All events</Link></Button> */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <h2 className="text-2xl font-semibold tracking-tight">Location</h2>
                        <h2 className="text-2xl font-semibold tracking-tight">Timetable</h2>
                    </div>
                </div>
            </div>
        </section>
    )
}