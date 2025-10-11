'use client'

import { useEffect, useState } from "react"
import { useParams, usePathname } from "next/navigation"
import Link from "next/link"
import { fetchEventPagesAction } from "@/app/actions/events"
import { fetchFloorplanAction } from "@/app/actions/features"
import { fetchMastersAction } from "@/app/actions/features"
import type { CareerEventPage, Booth, Master } from '@/lib/schema'
import { Button } from "@/components/ui/button"

export default function SubPage() {
  const [EVENTS, setEVENTS] = useState<CareerEventPage[]>([])
  const [page, setPage] = useState<CareerEventPage | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [allCategories, setAllCategories] = useState<{ short_name: string; name: string }[]>([])

  const params = useParams()
  const pathname = usePathname()

  const eventName = Array.isArray(params.eventName) ? params.eventName[0] : params.eventName

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

  const isFloorplanPage = pathname.endsWith("/floorplan")

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
          <Floorplan page={page} selectedCategories={selectedCategories} />
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
    </main>
  )
}

// ---------------- Header ----------------
function Header({
  categories,
  selectedCategories,
  setSelectedCategories,
  eventName, // <-- new prop
}: {
  categories: { short_name: string; name: string }[]
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
        <div className="flex items-center justify-between gap-3 rounded-2xl -mx-8 border bg-white/85 px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.10)] ring-1 ring-black/5 backdrop-blur-md md:px-5 md:py-3">
          
          {/* Left: Home + Floorplan + Event Name */}
          <div className="flex items-center gap-4">
            <Link href="/" className="rounded-full bg-vtk-blue px-4 py-2 text-sm font-medium text-white">
              Home
            </Link>
            <span className="text-sm font-semibold text-neutral-800">
              Floorplan – {eventName}
            </span>
          </div>

          {/* Right: category pills */}
          <div className="flex flex-wrap items-center gap-2">
            {categories.map(cat => (
              <button
                key={cat.short_name}
                onClick={() => toggleCategory(cat.short_name)}
                className={`px-3 py-1 rounded-full border font-medium text-sm ${
                  selectedCategories.includes(cat.short_name)
                    ? "bg-vtk-blue text-white border-vtk-blue"
                    : "bg-white text-neutral-800 border-neutral-300"
                }`}
              >
                {cat.short_name}
              </button>
            ))}
          </div>

        </div>
      </div>
    </header>
  )
}

// ---------------- Floorplan ----------------
export function Floorplan({
  page,
  selectedCategories,
}: {
  page: CareerEventPage
  selectedCategories: string[]
}) {
  const [svgContent, setSvgContent] = useState<string>("")
  const [booths, setBooths] = useState<Booth[]>([])
  const [renderedSvg, setRenderedSvg] = useState<string>("")

  useEffect(() => {
    const loadData = async () => {
      if (!page) return
      const data = await fetchFloorplanAction(page)
      const boothsData = (data?.booths || []).filter((b): b is Booth => b !== null)
      setBooths(boothsData)
      setSvgContent(data?.svg || "")
    }
    loadData()
  }, [page])

  useEffect(() => {
    if (!svgContent) return

    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgContent, "image/svg+xml")
    const svgEl = svgDoc.documentElement

    // Remove previously added highlight rects
    Array.from(svgEl.querySelectorAll("rect.highlight")).forEach(r => r.remove())

    booths.forEach((booth) => {
      if (!booth.coords) return

      // Ensure we have an array of Master objects
      const boothCats: Master[] = Array.isArray(booth.company?.category)
        ? booth.company.category.filter((c): c is Master => c != null)
        : []
      console.log(selectedCategories)
      console.log("test", boothCats)

      // Only highlight if the booth has all selected categories (AND logic)
      const isSelected =
        selectedCategories.length > 0 &&
        selectedCategories.every(cat => boothCats.map(c => c.short_name).includes(cat))

      if (!isSelected) return

      const rect = svgDoc.createElementNS("http://www.w3.org/2000/svg", "rect")
      rect.setAttribute("x", `${booth.coords.x_pct}%`)
      rect.setAttribute("y", `${booth.coords.y_pct}%`)
      rect.setAttribute("width", `${booth.coords.width_pct}%`)
      rect.setAttribute("height", `${booth.coords.height_pct}%`)
      rect.setAttribute("fill", "rgba(255,0,0,0.4)")
      rect.setAttribute("stroke", "#333")
      rect.setAttribute("stroke-width", "0.5%")
      rect.classList.add("highlight")
      svgEl.appendChild(rect)
    })

    setRenderedSvg(new XMLSerializer().serializeToString(svgEl))
  }, [svgContent, booths, selectedCategories])

  return (
    <div className="p-6 font-sans">
      <h1 className="text-3xl font-bold mb-4">Floorplan Viewer</h1>
      {renderedSvg ? (
        <div dangerouslySetInnerHTML={{ __html: renderedSvg }} />
      ) : svgContent ? (
        <p>Parsing SVG...</p>
      ) : (
        <p>Loading floorplan...</p>
      )}
    </div>
  )
}