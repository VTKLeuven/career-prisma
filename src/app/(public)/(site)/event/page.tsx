'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ScrollCue } from '../page'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from "next/navigation"
import { fetchEventPagesAction } from "@/app/actions/events"
import { getDirectusImageUrl } from "@/lib/repos/directus"
import { CareerEventPage, Company } from '@/lib/schema'
import dynamic from "next/dynamic"

const EventMap = dynamic(() => import("@/components/EventMap").then(mod => mod.EventMap), {
  ssr: false,
})

export default function EventPage() {
  const [EVENTS, setEVENTS] = useState<CareerEventPage[]>([])
  const searchParams = useSearchParams()
  const eventName = searchParams.get("name")

  const [popupMessage, setPopupMessage] = useState<string>("")
  const [popupContent, setPopupContent] = useState<React.ReactNode>(null)

  useEffect(() => {
    fetchEventPagesAction().then(setEVENTS)
  }, [])

  const page = EVENTS.find(
    (p) => p.event?.name?.toLowerCase() === eventName?.toLowerCase()
  )

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

  return (
    <>
      <Hero page={page} showPopupMessage={showPopupMessage} showPopupContent={showPopupContent} />
      <PracticalInformation page={page} />
      <Popup message={popupMessage} content={popupContent} onClose={closePopup} />
    </>
  )
}

// ---------------- Hero ----------------
function Hero({
  page,
  showPopupMessage,
  showPopupContent,
}: {
  page?: CareerEventPage
  showPopupMessage: (msg: string) => void
  showPopupContent: (content: React.ReactNode) => void
}) {
  const ref = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"])

  const handleRegisterClick = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if (!page?.registration_link) {
      e.preventDefault();
      showPopupMessage("Registration is not open yet. Please check back soon! 😊");
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

    showPopupContent(<CompanyPopup companies={companies} rows={rows} />)
  }

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden border-b min-h-[72vh] md:min-h-[82vh] -mt-2"
    >
      {/* Background */}
      <motion.div aria-hidden className="absolute inset-0" style={{ y }}>
        <Image
          src={
            getDirectusImageUrl(page?.event.image) ??
            "https://directustest.vtk.be/assets/1be725c7-bc66-47ba-b956-e7ae59978983.jpg"
          }
          alt={page?.event.name ?? "VTK Career events crowd"}
          fill
          priority
          className="object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/45 to-black/25" />

      {/* Text */}
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
              {/* Register button */}
              <Button
                variant="ghost"
                className="rounded-full bg-vtk-yellow text-black hover:brightness-95 cursor-pointer"
                onClick={handleRegisterClick}
              >
                Register
              </Button>

              {/* Explore companies button */}
              <Button
                variant="ghost"
                className="rounded-full bg-vtk-blue-dark text-white hover:brightness-95 cursor-pointer"
                onClick={handleExploreCompanies}
              >
                Explore companies
              </Button>
            </div>

          </motion.div>
        </div>
      </div>

      <ScrollCue />
    </section>
  )
}

// ---------------- CompanyPopup ----------------

function CompanyPopup({ companies, rows }: { companies: Company[]; rows: Company[][] }) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)

  if (selectedCompany) {
    const logoUrl = selectedCompany.logo ? getDirectusImageUrl(selectedCompany.logo) : undefined
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center px-6 py-4">
        <div className="flex items-center justify-center gap-2">
          {logoUrl && (
            <Image
              src={logoUrl}
              alt={selectedCompany.name ?? "Company logo"}
              width={30}
              height={30}
              className="object-contain"
            />
          )}
          <h2 className="text-2xl font-semibold text-vtk-blue">{selectedCompany.name}</h2>
        </div>

        {selectedCompany.short_description && (
          <div
            className="text-neutral-800 mt-2 prose prose-sm text-center"
            dangerouslySetInnerHTML={{ __html: selectedCompany.short_description }}
          />
        )}

        <button
          className="mt-4 text-vtk-blue text-lg font-bold"
          onClick={() => setSelectedCompany(null)}
        >
          ← Back
        </button>
      </div>
    )
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

  return (
    <section id="events" className="relative border-t bg-white">
      <div className="relative mx-auto max-w-7xl px-4 py-16">
        <div className="mb-6 flex flex-col gap-6">
          <div className="text-2xl font-semibold tracking-tight md:text-3xl">Practical Information</div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-semibold tracking-tight mb-4">Location</h2>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 shadow-sm flex flex-col gap-2">
                {page?.event.location && (
                  <h3 className="font-semibold text-neutral-900">{page?.event.location}</h3>
                )}
                {page?.address && <p className="text-neutral-700 flex items-center gap-2">📍 Address: {page.address}</p>}
                {page?.parking && <p className="text-neutral-700 flex items-center gap-2">🅿️ Parking: {page.parking}</p>}
              </div>

              {lat && lng && (
                <div className="rounded-lg border border-neutral-200 overflow-hidden shadow-sm mt-4">
                  <EventMap lat={lat} lng={lng} />
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-4">Timetable</h2>
              <div className="relative border-l-2 border-vtk-blue/30 pl-12">
                {page?.timetable?.map((item, index) => (
                  <div key={index} className="relative mb-10 last:mb-0">
                    <span className="absolute -left-7 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-vtk-yellow text-xl shadow-md">
                      {item.icon || "⭐"}
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
