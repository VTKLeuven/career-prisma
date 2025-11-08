'use client'

import { useEffect, useState, useRef } from "react"
import { useParams, usePathname } from "next/navigation"
import Link from "next/link"
import NextImage from "next/image"
import { fetchEventPagesAction } from "@/app/actions/events"
import { fetchFloorplanAction, fetchMastersAction } from "@/app/actions/features"
import type { CareerEventPage, Booth, Master, Company } from '@/lib/schema'
import { getDirectusImageUrl } from "@/components/Images"
import { usePageLayout } from '../../../layout'
import { Button } from "@/components/ui/button"
import { Clock, ArrowLeft, Users } from "lucide-react"

export default function SubPage() {
  const { setHideLayoutHeader } = usePageLayout()
  const [page, setPage] = useState<CareerEventPage | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [allCategories, setAllCategories] = useState<Master[]>([])
  const [popupCompany, setPopupCompany] = useState<Company | null>(null)
  const [booths, setBooths] = useState<Booth[]>([])
  const [flickerCompanyId, setFlickerCompanyId] = useState<string | null>(null)
  const [flickerState, setFlickerState] = useState(false)

  const params = useParams()
  const pathname = usePathname()
  const eventName = Array.isArray(params.eventName) ? params.eventName[0] : params.eventName
  const subPage = Array.isArray(params.subPage) ? params.subPage[0] : params.subPage
  const isFloorplanPage = pathname.endsWith("/floorplan")
  const isMatchingSoftwarePage = subPage === "matching-software"

  // Hide layout header when rendering floorplan header
  useEffect(() => {
    setHideLayoutHeader(isFloorplanPage)
    return () => setHideLayoutHeader(false)
  }, [isFloorplanPage, setHideLayoutHeader])

  useEffect(() => {
    async function load() {
      const events = await fetchEventPagesAction()

      if (!eventName) return
      const found = events.find(
        (p) =>
          p.event?.name &&
          p.event.name.toLowerCase().replace(/\s+/g, "-") === eventName
      )
      setPage(found ?? null)

      const categories = await fetchMastersAction()
      setAllCategories(categories)
    }
    load()
  }, [eventName])

  // Flicker effect
  const flickerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const triggerFlicker = (companyId: string) => {
    if (flickerIntervalRef.current) clearInterval(flickerIntervalRef.current)

    setFlickerCompanyId(companyId)
    setFlickerState(true)
    let count = 0

    flickerIntervalRef.current = setInterval(() => {
      setFlickerState(prev => !prev)
      count++
      if (count >= 6) { // 3 seconds, toggling every 0.5s
        clearInterval(flickerIntervalRef.current!)
        setFlickerState(false)
        setFlickerCompanyId(null)
        flickerIntervalRef.current = null
      }
    }, 500)
  }

  return (
    <main className="min-h-svh bg-vtk-bg text-neutral-900">
      {isFloorplanPage && page && (
        <>
          <Header
            categories={allCategories}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            booths={booths}
            triggerFlicker={triggerFlicker}
            eventName={page?.event?.name || ''}
          />
          <Floorplan
            page={page}
            selectedCategories={selectedCategories}
            onBoothClick={setPopupCompany}
            setBooths={setBooths}
            flickerCompanyId={flickerCompanyId}
            flickerState={flickerState}
            categories={allCategories}
            setSelectedCategories={setSelectedCategories}
          />
        </>
      )}

      {!isFloorplanPage && isMatchingSoftwarePage && (
        <ComingSoonPage 
          title="Matching Software" 
          description="Our matching software is currently under development. Soon you'll be able to connect with companies and find the perfect match for your career."
          eventName={page?.event?.name || eventName || 'Event'}
        />
      )}

      {!isFloorplanPage && !isMatchingSoftwarePage && (
        <div className="p-10 text-center text-neutral-700">
          <h1 className="text-2xl font-semibold">Subpage</h1>
          <p className="mt-2 text-sm text-neutral-500">
            (This section is under construction.)
          </p>
        </div>
      )}

      {popupCompany && (
        <Popup company={popupCompany} onClose={() => setPopupCompany(null)} />
      )}
    </main>
  )
}

// ---------------- Header ----------------
function Header({
  categories,
  selectedCategories,
  setSelectedCategories,
  booths,
  triggerFlicker,
  eventName,
}: {
  categories: Master[]
  selectedCategories: string[]
  setSelectedCategories: (cats: string[]) => void
  booths: Booth[]
  triggerFlicker: (companyId: string) => void
  eventName: string
}) {
  const toggleCategory = (short_name: string) => {
    if (selectedCategories.includes(short_name)) {
      setSelectedCategories(selectedCategories.filter(c => c !== short_name))
    } else {
      setSelectedCategories([...selectedCategories, short_name])
    }
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const matchingCompanies = isFocused
    ? booths.filter(b => b.company)
      .filter(b =>
        searchTerm
          ? b.company!.name.toLowerCase().includes(searchTerm.toLowerCase())
          : true
      )
      .sort((a, b) => (a.booth_number || "").localeCompare(b.booth_number || ""))
    : []

  return (
    <>
      <header className="fixed top-2 sm:top-4 inset-x-0 z-50 w-full px-2 sm:px-0">
        <div className="mx-auto max-w-7xl px-2 sm:px-4">
          {/* Mobile: Stack layout */}
          <div className="md:hidden flex flex-col gap-2">
            {/* Top row: Floorplan label + VTK Jobfair + Home */}
            <div className="flex items-center justify-between gap-2 rounded-xl border bg-white/85 px-2 sm:px-3 py-1.5 sm:py-2 shadow-md ring-1 ring-black/5 backdrop-blur-md">
              <span className="text-xs font-semibold text-neutral-800">Floorplan</span>
              <div className="flex items-center gap-2">
                <Link
                  href={`/event/${eventName.toLowerCase().replace(/\s+/g, "-")}`}
                  className="rounded-full bg-vtk-blue px-2.5 py-1 text-xs font-medium text-white cursor-pointer whitespace-nowrap"
                >
                  VTK Jobfair
                </Link>
                <Link
                  href="/"
                  className="rounded-full bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-800 cursor-pointer whitespace-nowrap"
                >
                  Home
                </Link>
              </div>
            </div>
            
            {/* Bottom row: Search only (categories moved to bottom of page on mobile) */}
            <div className="flex flex-col gap-2 rounded-xl border bg-white/85 px-2 sm:px-3 py-1.5 sm:py-2 shadow-md ring-1 ring-black/5 backdrop-blur-md">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                  placeholder="Search company..."
                  className="w-full rounded-full border border-gray-300 px-3 py-1.5 text-xs"
                />
                {matchingCompanies.length > 0 && (
                  <ul className="absolute top-full left-0 w-full mt-1 max-h-60 overflow-auto rounded-lg border bg-white shadow-lg z-50">
                    {matchingCompanies.map(b => (
                      <li
                        key={b.company!.id}
                        className="px-4 py-2 hover:bg-vtk-blue/10 cursor-pointer flex justify-between"
                        onClick={() => {
                          triggerFlicker(b.company!.id)
                          setSearchTerm("")
                          setIsFocused(false)
                        }}
                      >
                        <span>{b.company!.name}</span>
                        <span className="text-gray-500">{b.booth_number}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Desktop: Horizontal layout - original */}
          <div className="hidden md:flex items-center justify-between gap-3 rounded-2xl border bg-white/85 px-5 py-3 shadow-md ring-1 ring-black/5 backdrop-blur-md">
            {/* Left: Floorplan + Home + Event */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-neutral-800">Floorplan</span>
              <Link
                href="/"
                className="rounded-full bg-vtk-blue px-4 py-2 text-sm font-medium text-white cursor-pointer"
              >
                Home
              </Link>
              <Link
                href={`/event/${eventName.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-sm font-semibold text-neutral-800 hover:text-vtk-blue cursor-pointer transition-colors"
              >
                {eventName}
              </Link>
            </div>

            {/* Middle: Search bar */}
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder="Search company..."
                className="w-full rounded-full border border-gray-300 px-4 py-2 text-sm"
              />
              {matchingCompanies.length > 0 && (
                <ul className="absolute top-full left-0 w-full mt-1 max-h-60 overflow-auto rounded-lg border bg-white shadow-lg z-50">
                  {matchingCompanies.map(b => (
                    <li
                      key={b.company!.id}
                      className="px-4 py-2 hover:bg-vtk-blue/10 cursor-pointer flex justify-between"
                      onClick={() => {
                        triggerFlicker(b.company!.id)
                        setSearchTerm("")
                        setIsFocused(false)
                      }}
                    >
                      <span>{b.company!.name}</span>
                      <span className="text-gray-500">{b.booth_number}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Right: Category logos */}
            <div className="flex flex-wrap items-center gap-2">
              {categories.map(cat => {
                const isSelected = selectedCategories.includes(cat.short_name)
                return (
                  <button
                    key={cat.short_name}
                    onClick={() => toggleCategory(cat.short_name)}
                    className="relative w-10 h-10 rounded-full overflow-hidden border transition-all duration-200 cursor-pointer flex items-center justify-center"
                    style={{ borderColor: isSelected ? '#003366' : '#ccc' }}
                  >
                    <NextImage
                      src={getDirectusImageUrl(cat.logo) ?? ''}
                      alt={cat.short_name}
                      width={32}
                      height={32}
                      className={`object-contain transition-all duration-200 transform ${
                        isSelected
                          ? 'scale-110 grayscale-0 opacity-100'
                          : 'scale-90 grayscale-[50%] opacity-70'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

// ---------------- Floorplan ----------------
function Floorplan({
  page,
  selectedCategories,
  onBoothClick,
  setBooths,
  flickerCompanyId,
  flickerState,
  categories,
  setSelectedCategories,
}: {
  page: CareerEventPage
  selectedCategories: string[]
  onBoothClick: (company: Company) => void
  setBooths: (b: Booth[]) => void
  flickerCompanyId: string | null
  flickerState: boolean
  categories: Master[]
  setSelectedCategories: (cats: string[]) => void
}) {
  const toggleCategory = (short_name: string) => {
    if (selectedCategories.includes(short_name)) {
      setSelectedCategories(selectedCategories.filter(c => c !== short_name))
    } else {
      setSelectedCategories([...selectedCategories, short_name])
    }
  }
  const [boothsLocal, setBoothsLocal] = useState<Booth[]>([])
  const [svgContent, setSvgContent] = useState<string>("")
  const [viewBox, setViewBox] = useState<string>("0 0 1000 600")

  useEffect(() => {
    const loadData = async () => {
      if (!page) return
      const data = await fetchFloorplanAction(page)
      if (!data) return

      const boothsData = (data.booths || []).filter((b): b is Booth => b !== null)
      setBoothsLocal(boothsData)
      setBooths(boothsData)
      setSvgContent(data.svg || "")

      const parser = new DOMParser()
      const svgDoc = parser.parseFromString(data.svg || "", "image/svg+xml")
      const vb = svgDoc.documentElement.getAttribute("viewBox")
      if (vb) setViewBox(vb)
    }

    loadData()
  }, [page, setBooths])

  if (!svgContent) {
    return (
      <>
        <div className="pt-32 md:pt-[90px] flex justify-center items-center w-full min-h-[60vh]">
          <p className="text-neutral-600">Loading floorplan...</p>
        </div>
        {/* Mobile: Categories at bottom while loading */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t px-4 py-3 shadow-lg">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map(cat => {
              const isSelected = selectedCategories.includes(cat.short_name)
              return (
                <button
                  key={cat.short_name}
                  onClick={() => toggleCategory(cat.short_name)}
                  className="relative w-10 h-10 rounded-full overflow-hidden border-2 transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
                  style={{ borderColor: isSelected ? '#003366' : '#ccc' }}
                >
                  <NextImage
                    src={getDirectusImageUrl(cat.logo) ?? ''}
                    alt={cat.short_name}
                    width={36}
                    height={36}
                    className={`object-contain transition-all duration-200 transform ${
                      isSelected
                        ? 'scale-110 grayscale-0 opacity-100'
                        : 'scale-90 grayscale-[50%] opacity-70'
                    }`}
                  />
                </button>
              )
            })}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="pt-32 md:pt-[90px] flex justify-center w-full max-w-7xl px-2 sm:px-4 pb-20 md:pb-4">
        <svg
          viewBox={viewBox}
          className="w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g dangerouslySetInnerHTML={{ __html: svgContent }} />

          {boothsLocal.map((booth, i) => {
            if (!booth.coords || !booth.company) return null

            const boothCats: Master[] = Array.isArray(booth.company.category)
              ? booth.company.category.filter((c): c is Master => c !== null)
              : []

            const isCategorySelected =
              selectedCategories.length > 0 &&
              selectedCategories.every(cat =>
                boothCats.map(c => c.short_name).includes(cat)
              )

            const isFlicker = flickerCompanyId === booth.company.id && flickerState

            const isSelected = isFlicker || (!flickerCompanyId && isCategorySelected)

            return (
              <rect
                key={i}
                x={booth.coords.x_pct + "%"}
                y={booth.coords.y_pct + "%"}
                width={booth.coords.width_pct + "%"}
                height={booth.coords.height_pct + "%"}
                fill={isSelected ? "rgba(0,51,102,0.35)" : "transparent"}
                stroke={isSelected ? "#003366" : "transparent"}
                strokeWidth={isSelected ? 1 : 0}
                style={{ cursor: "pointer" }}
                onClick={() => onBoothClick(booth.company!)}
              />
            )
          })}
        </svg>
      </div>

      {/* Mobile: Categories at bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t px-4 py-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map(cat => {
            const isSelected = selectedCategories.includes(cat.short_name)
            return (
              <button
                key={cat.short_name}
                onClick={() => toggleCategory(cat.short_name)}
                className="relative w-10 h-10 rounded-full overflow-hidden border-2 transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
                style={{ borderColor: isSelected ? '#003366' : '#ccc' }}
              >
                <NextImage
                  src={getDirectusImageUrl(cat.logo) ?? ''}
                  alt={cat.short_name}
                  width={36}
                  height={36}
                  className={`object-contain transition-all duration-200 transform ${
                    isSelected
                      ? 'scale-110 grayscale-0 opacity-100'
                      : 'scale-90 grayscale-[50%] opacity-70'
                  }`}
                />
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ---------------- Popup ----------------
function ComingSoonPage({ title, description, eventName }: { title: string; description: string; eventName: string }) {
  const eventSlug = eventName.toLowerCase().replace(/\s+/g, "-")
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-vtk-blue/5 via-white to-vtk-yellow/5 flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="rounded-full bg-vtk-blue/10 p-6">
            <Users className="h-16 w-16 text-vtk-blue" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-neutral-900 mb-4">
          {title}
        </h1>
        <p className="text-xl sm:text-2xl text-neutral-600 mb-2">
          Coming Soon
        </p>
        <div className="flex items-center justify-center gap-2 text-neutral-500 mb-12">
          <Clock className="h-5 w-5" />
          <span>We're working on something amazing</span>
        </div>

        {/* Description */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-neutral-200 p-8 mb-8">
          <p className="text-lg text-neutral-700 leading-relaxed">
            {description}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            asChild
            className="rounded-full bg-vtk-blue hover:bg-vtk-blueDark text-white px-6 py-3"
          >
            <Link href={`/event/${eventSlug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-vtk-blue text-vtk-blue hover:bg-vtk-blue/10 px-6 py-3"
          >
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function Popup({ company, onClose }: { company: Company; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl bg-white text-neutral-900 px-8 py-6 shadow-2xl max-w-3xl w-full mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 text-neutral-500 hover:text-neutral-800"
          onClick={onClose}
        >
          ✕
        </button>

        {company.logo && (
          <div className="flex justify-center mb-4">
            <NextImage
              src={getDirectusImageUrl(company.logo) ?? ''}
              alt={company.name}
              width={100}
              height={80}
              className="object-contain"
            />
          </div>
        )}

        <h2 className="text-2xl font-semibold text-vtk-blue text-center mb-2">
          {company.name}
        </h2>

        {company.short_description && (
          <div className="text-center">
            <div
              className="text-neutral-800 mt-2 prose prose-sm mx-auto"
              style={{ display: "inline-block", textAlign: "center" }}
              dangerouslySetInnerHTML={{ __html: company.short_description }}
            />
          </div>
        )}

        {company.page_on_platform && (
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href={`/company/${(company.name || "").toLowerCase().replace(/\s+/g, "-")}`}
              className="rounded-full bg-vtk-blue text-white px-4 py-2 text-sm font-medium hover:bg-vtk-blueDark"
            >
              View company page
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}