'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ScrollCue } from '@/components/ScrollCue'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from "next/navigation"
import { fetchEventPageBySlugAction } from "@/app/actions/events"
import { SiteHeader, type SiteHeaderNavItem } from "@/components/site/SiteHeader"
import { getFileUrl } from "@/components/Images";
import { slugifyCompanyName, slugifyEventName, getSpeakerSlug } from "@/lib/utils/slugify";
import { hasCompanyPageAccess } from "@/lib/utils/company-access";
import { CompanyLikeButton } from "@/components/CompanyLikeButton";
import { CareerEventPage, Company, HeaderButtonType, Speaker, TimetableType } from '@/lib/schema'
import dynamic from "next/dynamic"
import { MapPin, Car, ExternalLink } from 'lucide-react'
import { useBannerPage } from '@/hooks/use-banner-page'
import { usePageLayout } from '../../layout'
import { groupSpeakersByTimeSlot } from '@/lib/utils/speakers'
import { compareTimetableItems } from '@/lib/utils/timetable'

const EventMap = dynamic(() => import("@/components/EventMap").then(mod => mod.EventMap), {
  ssr: false,
})

export default function EventPageClient({ 
  initialPage,
  eventName: initialEventName,
  floorplanEnabled = false
}: { 
  initialPage?: CareerEventPage | null
  eventName?: string
  /** Resolved on the server from DEV_ENVIRONMENT; see lib/dev-environment.ts. */
  floorplanEnabled?: boolean
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
  const pageCacheRef = useRef<Map<string, { data: CareerEventPage; ts: number }>>(new Map())
  const fetchPromiseRef = useRef<Map<string, Promise<CareerEventPage | null>>>(new Map())
  const CACHE_TTL_MS = 30_000 // 30s - so header_buttons updates show soon after admin changes

  // Start fetching immediately, don't wait for useEffect
  useEffect(() => {
    // If we have initial page data, use it and skip fetching
    if (initialPage && !page && eventName) {
      setPage(initialPage)
      pageCacheRef.current.set(eventName, { data: initialPage, ts: Date.now() })
      setIsLoading(false)
      return
    }

    // Skip if no eventName
    if (!eventName) {
      setIsLoading(false)
      return
    }

    // Check cache first - use only if fresh (within TTL)
    const cached = pageCacheRef.current.get(eventName)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setPage(cached.data)
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
        if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
          if (loadedEventRef.current !== eventName) return
          setPage(cached.data)
          setIsLoading(false)
          return
        }

        // Check if there's already a fetch in progress for this event
        let fetchPromise = fetchPromiseRef.current.get(eventName)
        if (!fetchPromise) {
          // Use API route for better caching and CDN support
          fetchPromise = fetch(`/api/events/${encodeURIComponent(eventName)}`, { cache: 'no-store' })
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
          pageCacheRef.current.set(eventName, { data: found, ts: Date.now() })
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

  // Use header_buttons to determine which header to show.
  // When header_buttons is undefined (legacy): use floorplan-based behavior.
  // When header_buttons exists: show event header only when at least one button is enabled.
  const headerButtons = page?.header_buttons
  const useEventHeader = headerButtons === undefined
    ? !!page?.floorplan
    : Array.isArray(headerButtons) && headerButtons.length > 0

  return (
    <>
      {useEventHeader ? (
        <Header page={page ?? undefined} floorplanEnabled={floorplanEnabled} />
      ) : (
        <SiteHeader />
      )}

      <Hero
        page={page ?? undefined}
        isLoading={isLoading}
        showPopupMessage={showPopupMessage}
        showPopupContent={showPopupContent}
        floorplanEnabled={floorplanEnabled}
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
/** Show button only if it's in header_buttons and has data (cv_upload always has data). Legacy: when header_buttons undefined, show based on data. */
function shouldShowHeaderButton(
  page: CareerEventPage & { hasActiveMatchingSoftware?: boolean },
  btn: HeaderButtonType,
  floorplanEnabled: boolean = false
): boolean {
  // The public floorplan is hidden outside the dev environment, whatever the
  // admin panel has enabled in header_buttons. The route itself redirects to
  // the homepage, so leaving the button visible would only dead-end visitors.
  if (btn === "floorplan" && !floorplanEnabled) return false
  const hasCompanyGuide = !!(
    typeof page.company_guide === "string"
      ? page.company_guide
      : (page.company_guide as unknown as { id?: string } | null)?.id
  )
  const buttons = page.header_buttons
  if (buttons === undefined) {
    if (btn === "cv_upload" || btn === "matching_software") return false
    return btn === "floorplan" ? !!page.floorplan : hasCompanyGuide
  }
  if (!Array.isArray(buttons) || !buttons.includes(btn)) return false
  if (btn === "matching_software") {
    // Hide when matching software is deactivated (active=false in Directus)
    if (page.hasActiveMatchingSoftware === false) return false
    return true
  }
  if (btn === "cv_upload") return true
  return btn === "floorplan" ? !!page.floorplan : hasCompanyGuide
}

/**
 * The event header: the same site header, with the edition's own buttons in
 * place of the standard nav and no Events dropdown (you are already on an
 * event). Everything else -- the account cluster, the mobile menu, the auth
 * check -- comes from SiteHeader, so it cannot drift from the rest of the site.
 */
function Header({ page, floorplanEnabled = false }: { page?: CareerEventPage; floorplanEnabled?: boolean }) {
  const slug = page ? page.event.series_key || slugifyEventName(page.event.name) : ""

  const navItems: SiteHeaderNavItem[] = []
  if (page) {
    if (shouldShowHeaderButton(page, "floorplan", floorplanEnabled)) {
      navItems.push({ key: "floorplan", label: "Floorplan", href: `/event/${slug}/floorplan` })
    }
    if (shouldShowHeaderButton(page, "matching_software")) {
      navItems.push({
        key: "matching",
        label: "Matching Software",
        mobileLabel: "Matching",
        href: `/event/${slug}/matching-software`,
      })
    }
    if (page.speakers && page.speakers.length > 0) {
      navItems.push({
        key: "discovery-stage",
        label: "Discovery Stage",
        onSelect: () =>
          document.getElementById("discovery-stage")?.scrollIntoView({ behavior: "smooth" }),
      })
    }
    if (shouldShowHeaderButton(page, "company_guide") && page.company_guide) {
      navItems.push({
        key: "company-guide",
        label: "Company guide",
        render: ({ isMobile }) => (
          <CompanyGuideButton companyGuide={page.company_guide!} isMobile={isMobile} eventName={slug} />
        ),
      })
    }
    if (shouldShowHeaderButton(page, "cv_upload")) {
      navItems.push({ key: "cv-upload", label: "CV Upload", href: "https://career.vtk.be/forms/cv-book" })
    }
  }

  return <SiteHeader navItems={navItems} />
}

// ---------------- Hero ----------------
function Hero({
  page,
  isLoading,
  showPopupMessage,
  showPopupContent,
  floorplanEnabled = false,
}: {
  page?: CareerEventPage
  isLoading: boolean
  showPopupMessage: (msg: string) => void
  showPopupContent: (content: React.ReactNode) => void
  floorplanEnabled?: boolean
}) {
  const ref = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"])
  const imageUrl = page?.image ? getFileUrl(page.image) : null

  const handleRegisterClick = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if (!page?.registration_link) {
      e.preventDefault();
      showPopupMessage("Registration is not open yet. Please check back soon!");
    } else {
      window.open(page.registration_link, "_blank");
    }
  };

  const handleExploreCompanies = async (e: React.MouseEvent) => {
    e.preventDefault()

    const eventId = page?.event?.id
    if (!eventId) {
      showPopupMessage("Company list coming soon!")
      return
    }

    showPopupContent(<p className="text-vtk-blue py-8">Loading companies...</p>)

    try {
      const res = await fetch(`/api/events/companies?eventId=${encodeURIComponent(eventId)}`)
      const data = (await res.json()) as { companies?: Company[] }
      let companies = (data.companies ?? []).filter((c): c is NonNullable<typeof c> => !!c)

      if (companies.length === 0) {
        companies = (page?.companies ?? []).filter((c): c is NonNullable<typeof c> => !!c)
      }

      if (companies.length === 0) {
        showPopupMessage("Company list coming soon!")
        return
      }
      showPopupContent(<CompanyPopup companies={companies} />)
    } catch {
      const fallback = (page?.companies ?? []).filter((c): c is NonNullable<typeof c> => !!c)
      if (fallback.length > 0) {
        showPopupContent(<CompanyPopup companies={fallback} />)
      } else {
        showPopupMessage("Company list coming soon!")
      }
    }
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
                  src="/api/files/1be725c7-bc66-47ba-b956-e7ae59978983"
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
                src="/api/files/1be725c7-bc66-47ba-b956-e7ae59978983"
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
                    Student registration
                  </Button>

                  {/* Floorplan button only when floorplan is in header_buttons (admin panel), otherwise Explore companies */}
                  {shouldShowHeaderButton(page, "floorplan", floorplanEnabled) ? (
                    <Button
                      asChild
                      variant="ghost"
                      className="rounded-full bg-vtk-blue-dark text-white hover:brightness-95 cursor-pointer text-sm sm:text-base"
                    >
                      <Link href={`/event/${page.event.series_key || slugifyEventName(page.event.name)}/floorplan`}>
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
  const scrollPositionRef = useRef<number>(0)

  // Companies with logos (grid order) for arrow navigation
  const companiesWithLogos = companies.filter((c) => c.logo && getFileUrl(c.logo))

  // Restore scroll position when returning to grid
  useEffect(() => {
    if (!selectedCompany && scrollPositionRef.current > 0) {
      const scrollEl = document.querySelector<HTMLElement>("[data-popup-scroll]")
      if (scrollEl) {
        scrollEl.scrollTop = scrollPositionRef.current
        scrollPositionRef.current = 0
      }
    }
  }, [selectedCompany])

  // Arrow key navigation when viewing a company
  useEffect(() => {
    if (!selectedCompany || companiesWithLogos.length <= 1) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        const idx = companiesWithLogos.findIndex((c) => c === selectedCompany)
        if (idx < 0) return
        const nextIdx = idx <= 0 ? companiesWithLogos.length - 1 : idx - 1
        setSelectedCompany(companiesWithLogos[nextIdx])
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        const idx = companiesWithLogos.findIndex((c) => c === selectedCompany)
        if (idx < 0) return
        const nextIdx = idx >= companiesWithLogos.length - 1 ? 0 : idx + 1
        setSelectedCompany(companiesWithLogos[nextIdx])
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedCompany, companiesWithLogos])

  const handleSelectCompany = (company: Company, fromElement?: HTMLElement) => {
    const scrollEl = fromElement?.closest<HTMLElement>("[data-popup-scroll]")
    if (scrollEl) scrollPositionRef.current = scrollEl.scrollTop
    setSelectedCompany(company)
  }

  const handleBack = () => {
    setSelectedCompany(null)
  }

  if (selectedCompany) {
    const slug = slugifyCompanyName(selectedCompany.name);
    const idx = companiesWithLogos.findIndex((c) => c === selectedCompany)
    const hasMultiple = companiesWithLogos.length > 1

    return (
      <div
        className="relative flex flex-col items-center justify-center gap-4 text-center px-6 py-4 min-h-[200px]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <CompanyLikeButton companyId={selectedCompany.id} inline compact />
          <button
            type="button"
            className="text-neutral-500 hover:text-neutral-800 p-1"
            onClick={handleBack}
            aria-label="Back to company list"
          >
            ✕
          </button>
        </div>

        {hasMultiple && (
          <>
            <button
              type="button"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-3 text-vtk-blue hover:bg-vtk-blue/10 text-2xl"
              onClick={() => setSelectedCompany(companiesWithLogos[idx <= 0 ? companiesWithLogos.length - 1 : idx - 1])}
              aria-label="Previous company"
            >
              ←
            </button>
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-3 text-vtk-blue hover:bg-vtk-blue/10 text-2xl"
              onClick={() => setSelectedCompany(companiesWithLogos[idx >= companiesWithLogos.length - 1 ? 0 : idx + 1])}
              aria-label="Next company"
            >
              →
            </button>
          </>
        )}

        <div className="flex items-center justify-center gap-2">
          <h2 className="text-2xl font-semibold text-vtk-blue">{selectedCompany.name}</h2>
        </div>

        {selectedCompany.short_description && (
          <div
            className="text-neutral-800 mt-2 prose prose-sm text-center"
            dangerouslySetInnerHTML={{ __html: selectedCompany.short_description }}
          />
        )}

        <div className="mt-4 flex items-center gap-3 flex-wrap justify-center">
          {hasCompanyPageAccess(selectedCompany) && (
            <Link
              href={`/company/${slug}`}
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

  // All companies grid
  const gridCols = companies.length > 20
    ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
    : "grid-cols-3 sm:grid-cols-4 md:grid-cols-4"

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-3 w-full">
      <h2 className="text-xl font-semibold text-vtk-blue mb-2 text-center">Attending Companies</h2>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        className={`grid gap-3 ${gridCols}`}
      >
        {companies.map((company, i) => {
          const logoUrl = company.logo ? getFileUrl(company.logo) : undefined
          if (!logoUrl) return null
          return (
            <motion.div
              key={i}
              className="group cursor-pointer flex justify-center relative"
              whileHover={{ y: -1, scale: 1.02 }}
              onClick={(e) => handleSelectCompany(company, e.currentTarget as HTMLElement)}
            >
              <div className="relative rounded-lg bg-white/90 p-2.5 shadow-[0_4px_12px_rgba(11,77,140,0.06)] ring-1 ring-black/5 hover:shadow-md transition-shadow">
                <CompanyLikeButton companyId={company.id} compact />
                <div className="size-14 flex items-center justify-center">
                  <Image
                    src={logoUrl}
                    alt={company.name ?? "Company logo"}
                    width={56}
                    height={56}
                    className="object-contain max-w-full max-h-full"
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
  const eventSlug = slugifyEventName(eventName)
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
      {isMobile ? "Guide" : "Company Guide"}
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
        className="rounded-2xl bg-white text-neutral-900 px-6 py-5 shadow-2xl max-w-4xl w-full mx-auto max-h-[85vh] overflow-y-auto scrollbar-hide"
        data-popup-scroll
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
const TIMETABLE_TYPE_LABELS: Record<TimetableType, string> = {
  student: 'For Students',
  company: 'For Companies',
  discovery: 'Discovery Stage',
}

function PracticalInformation({ page }: { page?: CareerEventPage }) {
  const lat = page?.location?.coordinates?.[1]
  const lng = page?.location?.coordinates?.[0]

  // Timetable type filter: collect unique types from items that have type
  const timetableTypes = (page?.timetable ?? []).reduce<TimetableType[]>((acc, item) => {
    const t = item.type
    if (Array.isArray(t)) {
      for (const v of t) {
        if ((v === 'student' || v === 'company' || v === 'discovery') && !acc.includes(v)) {
          acc.push(v)
        }
      }
    }
    return acc
  }, []).sort((a, b) => ['student', 'company', 'discovery'].indexOf(a) - ['student', 'company', 'discovery'].indexOf(b))
  const hasTimetableTypeFilter = timetableTypes.length > 0
  const [selectedTimetableType, setSelectedTimetableType] = useState<TimetableType | null>(null)

  useEffect(() => {
    if (hasTimetableTypeFilter && timetableTypes.length > 0) {
      setSelectedTimetableType((prev) =>
        prev && timetableTypes.includes(prev) ? prev : timetableTypes[0]
      )
    } else {
      setSelectedTimetableType(null)
    }
  }, [page?.timetable])

  const filteredTimetable = (page?.timetable ?? [])
    .filter((item) => {
      if (!hasTimetableTypeFilter || !selectedTimetableType) return true
      const t = item.type
      if (!t || !Array.isArray(t)) return true // no type = show in all
      return t.includes(selectedTimetableType)
    })
    .sort(compareTimetableItems)

  const eventSlug = page?.event?.series_key || (page?.event?.name ? slugifyEventName(page.event.name) : '')
  const allSpeakersForSlug = useMemo(() => {
    const fromPage = page?.speakers ?? []
    const fromTimetable = (page?.timetable ?? []).flatMap((t) => (t.speaker ? [t.speaker] : []))
    const byId = new Map<string, Speaker>()
    for (const s of [...fromPage, ...fromTimetable]) {
      if (s?.id) byId.set(s.id, s)
    }
    return Array.from(byId.values())
  }, [page])

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
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                {hasTimetableTypeFilter && (
                  <div className="flex border-b border-neutral-100">
                    {timetableTypes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTimetableType(t)}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                          selectedTimetableType === t
                            ? "border-b-2 border-vtk-blue text-vtk-blue bg-vtk-light/30"
                            : "text-neutral-500 hover:text-neutral-700"
                        }`}
                      >
                        {TIMETABLE_TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                )}
                <div className="p-4 space-y-3">
                  {filteredTimetable.map((item, index) => {
                    const speakerName = item.speaker?.representative
                      ? `${item.speaker.representative.first_name ?? ""} ${item.speaker.representative.last_name ?? ""}`.trim()
                      : null
                    const content = (
                      <div className="mt-1">
                        {item.speaker && speakerName ? (
                          <>
                            <p className="font-semibold text-neutral-900">{speakerName}</p>
                            <p className="text-sm text-neutral-600 mt-0.5">{item.title}</p>
                          </>
                        ) : (
                          <p className="font-semibold text-neutral-900">{item.title}</p>
                        )}
                        {item.description && (
                          <div className="text-neutral-600 mt-1 text-sm" dangerouslySetInnerHTML={{ __html: item.description }} />
                        )}
                      </div>
                    )
                    const timeStr = item.end_time ? `${item.start_time} – ${item.end_time}` : item.start_time
                    return (
                      <div key={item.id || index}>
                        {item.speaker && eventSlug ? (
                          <Link
                            href={`/event/${eventSlug}/speakers/${getSpeakerSlug(item.speaker, allSpeakersForSlug)}`}
                            className="block rounded-lg border border-neutral-200 bg-neutral-50 p-4 hover:shadow-md hover:border-vtk-blue/50 transition-all cursor-pointer"
                          >
                            <span className="text-xs font-medium text-vtk-blue">{timeStr}</span>
                            {content}
                          </Link>
                        ) : (
                          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                            <span className="text-xs font-medium text-vtk-blue">{timeStr}</span>
                            {content}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {filteredTimetable.length === 0 && (
                    <p className="py-6 text-center text-sm text-neutral-500">No timetable items.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Speakers - same timeslot = one card */}
          {page?.speakers && page.speakers.length > 0 && (
            <div id="discovery-stage" className="mt-12 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-6">
                Discovery Stage
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {groupSpeakersByTimeSlot(page.speakers ?? []).map((group) => (
                  group.length === 1 ? (
                    <SpeakerCard key={group[0].id} speaker={group[0]} eventSlug={page.event.series_key || slugifyEventName(page.event.name)} allSpeakers={page.speakers ?? []} />
                  ) : (
                    <SpeakerCardMulti key={group[0].id} speakers={group} eventSlug={page.event.series_key || slugifyEventName(page.event.name)} allSpeakers={page.speakers ?? []} />
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

const KU_LEUVEN_LOGO_ID = "d93c21e6-1145-4d4e-96d2-7e8daa640b9f"

// ---------------- SpeakerCard ----------------
function SpeakerCard({ speaker, eventSlug, allSpeakers }: { speaker: Speaker; eventSlug: string; allSpeakers: Speaker[] }) {
  const rep = speaker.representative
  const avatarUrl = rep?.avatar ? getFileUrl(rep.avatar) : undefined
  const company = rep?.company
  // PhD fallback: no company → assume KU Leuven
  const displayCompany = company ?? { name: "KU Leuven", logo: KU_LEUVEN_LOGO_ID }
  const companyLogoUrl = displayCompany.logo ? getFileUrl(displayCompany.logo) : undefined
  const startHour = speaker.time?.start_time
  const endHour = speaker.time?.end_time
  const timeLabel = startHour && endHour ? `${startHour} - ${endHour}` : startHour ?? endHour ?? null

  return (
    <Link
      href={`/event/${eventSlug}/speakers/${getSpeakerSlug(speaker, allSpeakers)}`}
      className="flex w-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Square photo with time overlay */}
      <div className="relative aspect-square w-full">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={rep ? `${rep.first_name ?? ""} ${rep.last_name ?? ""}`.trim() || "Speaker" : "Speaker"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-2xl font-semibold text-neutral-400">
            {(rep?.first_name?.[0] ?? rep?.last_name?.[0] ?? "?")}
          </div>
        )}
        {timeLabel && (
          <div className="absolute top-1.5 right-1.5 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-vtk-blue shadow-sm">
            {timeLabel}
          </div>
        )}
      </div>
      {/* Name + company below photo (PhD fallback: KU Leuven when no company) */}
      <div className="p-2 text-center">
        <div className="text-sm font-semibold text-neutral-900">{(rep?.first_name ?? "")} {rep?.last_name}</div>
        <div className="mt-1 flex items-center justify-center gap-1.5">
          {companyLogoUrl && (
            <div className="h-4 w-4 shrink-0 overflow-hidden rounded">
              <Image
                src={companyLogoUrl}
                alt={displayCompany.name}
                width={16}
                height={16}
                className="h-full w-full object-contain"
              />
            </div>
          )}
          <span className="text-xs text-neutral-600 truncate">{displayCompany.name}</span>
        </div>
      </div>
    </Link>
  )
}

// ---------------- SpeakerCardMulti (multiple speakers, same timeslot) ----------------
function SpeakerCardMulti({ speakers, eventSlug, allSpeakers }: { speakers: Speaker[]; eventSlug: string; allSpeakers: Speaker[] }) {
  const t = speakers[0]?.time
  const timeLabel = t ? (t.start_time && t.end_time ? `${t.start_time} - ${t.end_time}` : t.start_time ?? t.end_time ?? null) : null

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-square w-full flex">
        {speakers.map((speaker) => {
          const rep = speaker.representative
          const avatarUrl = rep?.avatar ? getFileUrl(rep.avatar) : undefined
          return (
            <Link
              key={speaker.id}
              href={`/event/${eventSlug}/speakers/${getSpeakerSlug(speaker, allSpeakers)}`}
              className="relative flex-1 min-w-0"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={rep ? `${rep.first_name ?? ""} ${rep.last_name ?? ""}`.trim() || "Speaker" : "Speaker"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-2xl font-semibold text-neutral-400">
                  {(rep?.first_name?.[0] ?? rep?.last_name?.[0] ?? "?")}
                </div>
              )}
            </Link>
          )
        })}
        {timeLabel && (
          <div className="absolute top-1.5 right-1.5 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-vtk-blue shadow-sm">
            {timeLabel}
          </div>
        )}
      </div>
      <div className="p-2 space-y-2">
        {speakers.map((speaker) => {
          const rep = speaker.representative
          const company = rep?.company
          const displayCompany = company ?? { name: "KU Leuven", logo: KU_LEUVEN_LOGO_ID }
          const companyLogoUrl = displayCompany.logo ? getFileUrl(displayCompany.logo) : undefined
          return (
            <Link
              key={speaker.id}
              href={`/event/${eventSlug}/speakers/${getSpeakerSlug(speaker, allSpeakers)}`}
              className="block text-center hover:bg-neutral-50 -mx-1 px-1 py-0.5 rounded transition-colors"
            >
              <div className="text-sm font-semibold text-neutral-900">{(rep?.first_name ?? "")} {rep?.last_name}</div>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                {companyLogoUrl && (
                  <div className="h-4 w-4 shrink-0 overflow-hidden rounded">
                    <Image src={companyLogoUrl} alt={displayCompany.name} width={16} height={16} className="h-full w-full object-contain" />
                  </div>
                )}
                <span className="text-xs text-neutral-600 truncate">{displayCompany.name}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
