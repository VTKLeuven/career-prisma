'use client'

import { useEffect, useState } from "react"
import { useParams, usePathname } from "next/navigation"
import { fetchEventPagesAction } from "@/app/actions/events"
import { fetchFloorplanAction } from "@/app/actions/features"
import type { CareerEventPage, Booth } from '@/lib/schema'

export default function SubPage() {
  const [EVENTS, setEVENTS] = useState<CareerEventPage[]>([])
  const [page, setPage] = useState<CareerEventPage | null>(null)

  const params = useParams()
  const pathname = usePathname()

  // Handle params safely
  const eventName = Array.isArray(params.eventName)
    ? params.eventName[0]
    : params.eventName
  const subPage = Array.isArray(params.subPage)
    ? params.subPage[0]
    : params.subPage

  // Fetch events and find correct page
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
    }
    load()
  }, [eventName])

  // Only render the floorplan if /floorplan
  const isFloorplanPage = pathname.endsWith("/floorplan")

  return (
    <main className="min-h-svh bg-vtk-bg text-neutral-900">
      {isFloorplanPage && page && <Floorplan page={page} />}
      {!isFloorplanPage && (
        <div className="p-10 text-center text-neutral-700">
          <h1 className="text-2xl font-semibold">Subpage: {subPage}</h1>
          <p className="mt-2 text-sm text-neutral-500">
            (This section is under construction.)
          </p>
        </div>
      )}
    </main>
  )
}

// -------- FLOORPLAN COMPONENT --------
function Floorplan({ page }: { page: CareerEventPage }) {
  const [svgContent, setSvgContent] = useState<string>("")
  const [booths, setBooths] = useState<Booth[]>([])
  const [renderedSvg, setRenderedSvg] = useState<string>("")

  useEffect(() => {
    const loadData = async () => {
      if (!page) return
      const data = await fetchFloorplanAction(page)
      const boothsData = (data?.booths || [])
        .filter((b): b is NonNullable<typeof b> => b !== null) // remove nulls
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
    console.log(booths)
    booths.forEach((booth) => {
      if (!booth.coords) return
      const rect = svgDoc.createElementNS("http://www.w3.org/2000/svg", "rect")
      rect.setAttribute("x", `${booth.coords.x_pct}%`)
      rect.setAttribute("y", `${booth.coords.y_pct}%`)
      rect.setAttribute("width", `${booth.coords.width_pct}%`)
      rect.setAttribute("height", `${booth.coords.height_pct}%`)
      rect.setAttribute(
        "fill",
        booth.company?.category?.short_name === "WTK"
          ? "rgba(255,0,0,0.4)"
          : "rgba(0,128,255,0.4)"
      )
      rect.setAttribute("stroke", "#333")
      rect.setAttribute("stroke-width", "0.5%")
      svgEl.appendChild(rect)
    })

    setRenderedSvg(new XMLSerializer().serializeToString(svgEl))
  }, [svgContent, booths])

  return (
    <div className="p-6 font-sans">
      <h1 className="text-3xl font-bold mb-4">Floorplan Viewer</h1>
      {renderedSvg ? (
        <div
          dangerouslySetInnerHTML={{ __html: renderedSvg }}
          className="w-full h-auto"
        />
      ) : svgContent ? (
        <p>Parsing SVG...</p>
      ) : (
        <p>Loading floorplan...</p>
      )}
    </div>
  )
}
