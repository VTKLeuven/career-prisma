'use client'

import { useEffect, useState, useRef } from "react"
import { useParams, usePathname } from "next/navigation"
import Link from "next/link"
import NextImage from "next/image"
import { fetchEventPagesAction } from "@/app/actions/events"
import { fetchFloorplanAction, fetchMastersAction } from "@/app/actions/features"
import type { CareerEventPage, Booth, Master, Company } from '@/lib/schema'
import { getDirectusImageUrl } from "@/components/Images"

export default function SubPage() {
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
  const isFloorplanPage = pathname.endsWith("/floorplan")

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
}: {
  page: CareerEventPage
  selectedCategories: string[]
  onBoothClick: (company: Company) => void
  setBooths: (b: Booth[]) => void
  flickerCompanyId: string | null
  flickerState: boolean
}) {
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

  if (!svgContent) return <p>Loading floorplan...</p>

  return (
    <div className="pt-[90px] flex justify-center w-full max-w-7xl px-4">
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
      </div>
    </div>
  )
}