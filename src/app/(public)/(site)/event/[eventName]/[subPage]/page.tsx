'use client'

import { useEffect, useState } from "react"
import { useParams, usePathname } from "next/navigation"
import Link from "next/link"
import { fetchEventPagesAction } from "@/app/actions/events"
import { fetchFloorplanAction, fetchMastersAction } from "@/app/actions/features"
import type { CareerEventPage, Booth, Master, Company } from '@/lib/schema'
import { getDirectusImageUrl } from "@/lib/repos/directus"

export default function SubPage() {
  const [EVENTS, setEVENTS] = useState<CareerEventPage[]>([])
  const [page, setPage] = useState<CareerEventPage | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [allCategories, setAllCategories] = useState<Master[]>([])
  const [popupCompany, setPopupCompany] = useState<Company | null>(null)

  const params = useParams()
  const pathname = usePathname()
  const eventName = Array.isArray(params.eventName) ? params.eventName[0] : params.eventName
  const isFloorplanPage = pathname.endsWith("/floorplan")

  useEffect(() => {
    async function load() {
      const events = await fetchEventPagesAction()
      setEVENTS(events)

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

  return (
    <main className="min-h-svh bg-vtk-bg text-neutral-900">
      {isFloorplanPage && page && (
        <>
          <Header
            categories={allCategories}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            eventName={page?.event?.name || ''}
          />
          <Floorplan
            page={page}
            selectedCategories={selectedCategories}
            onBoothClick={setPopupCompany}
          />
        </>
      )}

      {!isFloorplanPage && (
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
  eventName,
}: {
  categories: Master[]
  selectedCategories: string[]
  setSelectedCategories: (cats: string[]) => void
  eventName: string
}) {
  const toggleCategory = (short_name: string) => {
    if (selectedCategories.includes(short_name)) {
      setSelectedCategories(selectedCategories.filter(c => c !== short_name))
    } else {
      setSelectedCategories([...selectedCategories, short_name])
    }
  }

  return (
    <header className="fixed top-4 inset-x-0 z-50 w-full">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl -mx-8 border bg-white/85 px-3 py-2 shadow-md ring-1 ring-black/5 backdrop-blur-md md:px-5 md:py-3">
          
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
                  <img
                    src={getDirectusImageUrl(cat.logo)}
                    alt={cat.short_name}
                    className={`w-8 h-8 object-contain transition-all duration-200 transform ${
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
  )
}

// ---------------- Floorplan ----------------
function Floorplan({
  page,
  selectedCategories,
  onBoothClick,
}: {
  page: CareerEventPage
  selectedCategories: string[]
  onBoothClick: (company: Company) => void
}) {
  const [booths, setBooths] = useState<Booth[]>([])
  const [svgContent, setSvgContent] = useState<string>("")
  const [viewBox, setViewBox] = useState<string>("0 0 1000 600") // default

  useEffect(() => {
    const loadData = async () => {
      if (!page) return
      const data = await fetchFloorplanAction(page)
      if (!data) return

      const boothsData = (data.booths || []).filter((b): b is Booth => b !== null)
      setBooths(boothsData)
      setSvgContent(data.svg || "")

      // Extract viewBox
      const parser = new DOMParser()
      const svgDoc = parser.parseFromString(data.svg || "", "image/svg+xml")
      const vb = svgDoc.documentElement.getAttribute("viewBox")
      if (vb) setViewBox(vb)
    }

    loadData()
  }, [page])

  if (!svgContent) return <p>Loading floorplan...</p>

  return (
    <div className="pt-[90px] flex justify-center w-full max-w-7xl px-4">
      <svg
        viewBox={viewBox}
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Original SVG elements */}
        <g dangerouslySetInnerHTML={{ __html: svgContent }} />

        {/* Booth overlays */}
        {booths.map((booth, i) => {
          if (!booth.coords || !booth.company) return null

          const boothCats: Master[] = Array.isArray(booth.company.category)
            ? booth.company.category.filter((c): c is Master => c !== null)
            : []

          const isSelected =
            selectedCategories.length > 0 &&
            selectedCategories.every(cat =>
              boothCats.map(c => c.short_name).includes(cat)
            )

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
  )
}


// ---------------- Popup ----------------
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

        {/* Logo */}
        {company.logo && (
          <div className="flex justify-center mb-4">
            <img
              src={getDirectusImageUrl(company.logo)}
              alt={company.name}
              className="object-contain max-h-20"
            />
          </div>
        )}

        {/* Company Name */}
        <h2 className="text-2xl font-semibold text-vtk-blue text-center mb-2">
          {company.name}
        </h2>

        {/* Company Description */}
        {company.short_description && (
          <div className="text-center">
            <div
              className="text-neutral-800 mt-2 prose prose-sm mx-auto"
              style={{ display: "inline-block", textAlign: "center" }}
              dangerouslySetInnerHTML={{ __html: company.short_description }}
            />
          </div>
        )}
      </div>
    </div>
  )
}