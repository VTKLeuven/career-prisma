'use client'

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import NextImage from "next/image"
import { fetchEventPagesAction } from "@/app/actions/events"
import { fetchFloorplanAction } from "@/app/actions/features"
import type { CareerEventPage, Booth, Company } from '@/lib/schema'
import { getDirectusImageUrl } from "@/components/Images"
import { Button } from "@/components/ui/button"
import { ArrowLeft, X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export default function AdminFloorplanPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId
  
  const [page, setPage] = useState<CareerEventPage | null>(null)
  const [booths, setBooths] = useState<Booth[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [svgContent, setSvgContent] = useState<string>("")
  const [viewBox, setViewBox] = useState<string>("0 0 1000 600")
  const [originalViewBox, setOriginalViewBox] = useState<string>("0 0 1000 600")
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!eventId) return
      
      try {
        const { getEventPageWithFloorplan, getBoothsForFloorplan, getCompaniesForEvent } = await import("@/lib/repos/floorplan")
        
        // Fetch event page with floorplan
        const eventPage = await getEventPageWithFloorplan(eventId)
        if (!eventPage || !eventPage.floorplan) {
          console.error("No floorplan found for this event")
          return
        }
        
        setPage(eventPage)
        
        // Fetch SVG content and booths first (need booths for viewBox calculation)
        const data = await fetchFloorplanAction(eventPage)
        const boothsData = eventPage.floorplan.id
          ? await getBoothsForFloorplan(eventPage.floorplan.id)
          : []
        
        if (data) {
          setSvgContent(data.svg || "")
          
          const parser = new DOMParser()
          const rawSvg = data.svg || ""
          const svgDoc = parser.parseFromString(rawSvg, "image/svg+xml")
          const svgRoot = svgDoc.documentElement
          const originalVb = svgRoot?.getAttribute("viewBox") || "0 0 1000 600"
          setOriginalViewBox(originalVb)
          
          // Calculate tight viewBox from booth bounds (reduces vertical whitespace)
          const origVbParts = originalVb.split(/\s+/).map(Number)
          if (origVbParts.length === 4 && boothsData.length > 0) {
            const [origVbX, origVbY, origVbWidth, origVbHeight] = origVbParts
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
            boothsData.forEach((booth: Booth) => {
              if (!booth.coords) return
              const coords = typeof booth.coords === "string" ? JSON.parse(booth.coords) : booth.coords
              const boothX = origVbX + (coords.x_pct / 100) * origVbWidth
              const boothY = origVbY + (coords.y_pct / 100) * origVbHeight
              const boothWidth = (coords.width_pct / 100) * origVbWidth
              const boothHeight = (coords.height_pct / 100) * origVbHeight
              minX = Math.min(minX, boothX)
              minY = Math.min(minY, boothY)
              maxX = Math.max(maxX, boothX + boothWidth)
              maxY = Math.max(maxY, boothY + boothHeight)
            })
            if (minX < maxX && minY < maxY) {
              const pad = Math.min(origVbWidth, origVbHeight) * 0.02
              setViewBox(`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`)
            } else {
              setViewBox(originalVb)
            }
          } else {
            setViewBox(originalVb)
          }
        }
        
        setBooths(boothsData)
        
        // Fetch companies - use from event page if available, otherwise fetch separately
        if (eventPage.companies && Array.isArray(eventPage.companies) && eventPage.companies.length > 0) {
          setCompanies(eventPage.companies)
        } else {
          const companiesData = await getCompaniesForEvent(eventId)
          setCompanies(companiesData)
        }
      } catch (error) {
        console.error("Error loading floorplan data:", error)
      }
    }

    loadData()
  }, [eventId])

  const handleBoothClick = (booth: Booth) => {
    setSelectedBooth(booth)
  }

  const handleAssignCompany = async (companyId: string) => {
    if (!selectedBooth) return
    
    // Handle unassign (special value)
    const actualCompanyId = companyId === "__none__" ? null : companyId
    
    setUpdating(true)
    try {
      const response = await fetch("/api/admin/update-booth-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boothId: selectedBooth.id,
          companyId: actualCompanyId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update booth")
      }

      // Refresh booths
      if (page?.floorplan?.id) {
        const { getBoothsForFloorplan } = await import("@/lib/repos/floorplan")
        const updatedBooths = await getBoothsForFloorplan(page.floorplan.id)
        setBooths(updatedBooths)
        
        // Update selected booth
        const updatedBooth = updatedBooths.find(b => b.id === selectedBooth.id)
        if (updatedBooth) {
          setSelectedBooth(updatedBooth)
        }
      }
    } catch (error) {
      console.error("Error assigning company:", error)
      alert(error instanceof Error ? error.message : "Failed to assign company")
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteFloorplan = async () => {
    if (!page?.floorplan?.id) return
    
    setDeleting(true)
    try {
      const response = await fetch("/api/admin/delete-floorplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          floorplanId: page.floorplan.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete floorplan")
      }

      // Redirect back to admin page
      router.push("/admin")
    } catch (error) {
      console.error("Error deleting floorplan:", error)
      alert(error instanceof Error ? error.message : "Failed to delete floorplan")
      setDeleting(false)
    }
  }

  const assignedCompanyIds = new Set(booths.filter(b => b.company).map(b => b.company!.id))
  const availableCompanies = companies.filter(
    c => !assignedCompanyIds.has(c.id) || (selectedBooth?.company?.id === c.id)
  )

  if (!page || !page.floorplan) {
    return (
      <div className="min-h-screen bg-vtk-bg text-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600 mb-4">No floorplan found for this event.</p>
          <Button asChild>
            <Link href="/admin">Back to Admin</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 bg-white/95 backdrop-blur-md border rounded-lg shadow-sm">
        {/* Left: Back + Event name */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Link
            href="/admin"
            className="rounded-full bg-vtk-blue px-4 py-2 text-sm font-medium text-white hover:bg-vtk-blueDark transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            Back to Admin
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-neutral-800 whitespace-nowrap">
              Edit Floorplan
            </span>
            <span className="text-sm font-semibold text-neutral-600 truncate">
              {page.event?.name || "Event"}
            </span>
          </div>
        </div>

        {/* Right: Delete button */}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          className="whitespace-nowrap"
        >
          Delete Floorplan
        </Button>
      </div>

      {/* Floorplan */}
      <div className="flex justify-center w-full px-2 sm:px-4 pb-4">
        <div className="w-full max-w-full">
          {svgContent ? (
            <svg
              ref={svgRef}
              viewBox={viewBox}
              className="w-full h-auto min-w-0 min-h-[80vh]"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Floorplan SVG as image - preserves exact rendering */}
              {(() => {
                const p = originalViewBox.split(/\s+/).map(Number)
                if (p.length !== 4) return null
                const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`
                return (
                  <image
                    href={dataUrl}
                    x={p[0]}
                    y={p[1]}
                    width={p[2]}
                    height={p[3]}
                    preserveAspectRatio="xMidYMid meet"
                  />
                )
              })()}

              {booths.map((booth) => {
                if (!booth.coords) return null

                const coords = typeof booth.coords === "string" 
                  ? JSON.parse(booth.coords) 
                  : booth.coords

                const isSelected = selectedBooth?.id === booth.id
                const hasCompany = !!booth.company

                // Convert booth percentage coordinates to absolute coordinates
                const origVbParts = originalViewBox.split(/\s+/).map(Number)
                if (origVbParts.length !== 4) return null
                const [origVbX, origVbY, origVbWidth, origVbHeight] = origVbParts

                const boothX = origVbX + (coords.x_pct / 100) * origVbWidth
                const boothY = origVbY + (coords.y_pct / 100) * origVbHeight
                const boothWidth = (coords.width_pct / 100) * origVbWidth
                const boothHeight = (coords.height_pct / 100) * origVbHeight
                const rotation = coords.rotation_deg
                const boothCx = boothX + boothWidth / 2
                const boothCy = boothY + boothHeight / 2

                const boothShape = rotation != null && Math.abs(rotation) > 0.5
                  ? (() => {
                      const rad = (rotation * Math.PI) / 180
                      const c = Math.cos(rad)
                      const s = Math.sin(rad)
                      const hw = boothWidth / 2
                      const hh = boothHeight / 2
                      const x1 = boothCx + (-hw * c + hh * s)
                      const y1 = boothCy + (-hw * s - hh * c)
                      const x2 = boothCx + (hw * c + hh * s)
                      const y2 = boothCy + (hw * s - hh * c)
                      const x3 = boothCx + (hw * c - hh * s)
                      const y3 = boothCy + (hw * s + hh * c)
                      const x4 = boothCx + (-hw * c - hh * s)
                      const y4 = boothCy + (-hw * s + hh * c)
                      return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z`
                    })()
                  : null

                const fill = isSelected ? "rgba(0,51,102,0.4)" : hasCompany ? "rgba(0,51,102,0.15)" : "rgba(255,0,0,0.08)"
                const stroke = isSelected ? "#003366" : hasCompany ? "#003366" : "#ff0000"

                return boothShape ? (
                  <path
                    key={booth.id}
                    d={boothShape}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 2 : 1}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleBoothClick(booth)}
                  />
                ) : (
                  <rect
                    key={booth.id}
                    x={boothX}
                    y={boothY}
                    width={boothWidth}
                    height={boothHeight}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 2 : 1}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleBoothClick(booth)}
                  />
                )
              })}
            </svg>
          ) : (
            <div className="flex justify-center items-center min-h-[60vh]">
              <p className="text-neutral-600">Loading floorplan...</p>
            </div>
          )}
        </div>
      </div>

      {/* Company Assignment Panel */}
      {selectedBooth && (
        <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border rounded-lg shadow-lg p-4 mt-4">
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">
                  Booth {String(selectedBooth.booth_number)}
                </h3>
                {selectedBooth.company && (
                  <p className="text-sm text-muted-foreground">
                    Currently assigned to: {selectedBooth.company.name}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedBooth(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              <Select
                value={selectedBooth.company?.id || "__none__"}
                onValueChange={handleAssignCompany}
                disabled={updating}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a company..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (Unassign)</SelectItem>
                  {availableCompanies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {updating && (
                <span className="text-sm text-muted-foreground">Updating...</span>
              )}
            </div>
            
            {availableCompanies.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No available companies. All companies are already assigned to other booths.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Floorplan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this floorplan? This will also delete all associated booths. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFloorplan}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

