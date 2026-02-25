'use client'

import { useEffect, useState, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { fetchFloorplanAction } from "@/app/actions/features"
import { fetchCompaniesForEventAction } from "@/app/actions/companies"
import { fetchAllCompanyFormsForEventAction, fetchCompanyIdsMatchingFormFieldOptionAction } from "@/app/actions/forms"
import type { CareerEventPage, Booth, Company } from '@/lib/schema'
import type { FormField } from '@/lib/schema'
import { Button } from "@/components/ui/button"
import { ArrowLeft, X, Filter } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCompanySubOptionAnyStatus } from "@/lib/utils/company-access"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

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

  // Form response filter for highlighting booths (supports multiple filters)
  type EventForm = { id: string; name: string; slug: string; activeVersion: { id: string; version_number: number; schema: { fields: FormField[] } } }
  type FormFilter = { formId: string; formVersionId: string; fieldName: string; optionValue: string }
  const [eventForms, setEventForms] = useState<EventForm[]>([])
  const [formsLoading, setFormsLoading] = useState(false)
  const [filters, setFilters] = useState<FormFilter[]>([])
  const [matchedCompanyIds, setMatchedCompanyIds] = useState<Set<string>>(new Set())
  const [filterLoading, setFilterLoading] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!eventId) return
      
      try {
        const { getEventPageWithFloorplan, getBoothsForFloorplan } = await import("@/lib/repos/floorplan")
        
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
          setViewBox(originalVb)
        }
        
        setBooths(boothsData)
        
        // Fetch all companies for event (no cap - uses company options, limit: -1)
        const companiesData = await fetchCompaniesForEventAction(eventId, false)
        setCompanies(companiesData ?? [])
      } catch (error) {
        console.error("Error loading floorplan data:", error)
      }
    }

    loadData()
  }, [eventId])

  // Load company forms for this event
  useEffect(() => {
    if (!eventId) return
    setFormsLoading(true)
    fetchAllCompanyFormsForEventAction(eventId)
      .then(setEventForms)
      .catch(console.error)
      .finally(() => setFormsLoading(false))
  }, [eventId])

  // Load matched company IDs when filters change (union of all complete filters)
  useEffect(() => {
    const complete = filters.filter(f => f.formVersionId && f.fieldName && f.optionValue)
    if (complete.length === 0) {
      setMatchedCompanyIds(new Set())
      return
    }
    setFilterLoading(true)
    Promise.all(
      complete.map(f =>
        fetchCompanyIdsMatchingFormFieldOptionAction(f.formVersionId, f.fieldName, f.optionValue)
      )
    )
      .then(results => {
        const union = new Set<string>()
        for (const ids of results) ids.forEach(id => union.add(id))
        setMatchedCompanyIds(union)
      })
      .catch(console.error)
      .finally(() => setFilterLoading(false))
  }, [filters])

  const addFilter = () => setFilters([...filters, { formId: "", formVersionId: "", fieldName: "", optionValue: "" }])
  const removeFilter = (idx: number) => setFilters(filters.filter((_, i) => i !== idx))
  const updateFilter = (idx: number, updates: Partial<FormFilter>) => {
    const next = [...filters]
    next[idx] = { ...next[idx], ...updates }
    if (updates.formId !== undefined) {
      const form = eventForms.find(f => f.id === updates.formId)
      next[idx].formVersionId = form?.activeVersion?.id ?? ""
      next[idx].fieldName = ""
      next[idx].optionValue = ""
    }
    if (updates.fieldName !== undefined) next[idx].optionValue = ""
    setFilters(next)
  }

  const getOptionFieldsForForm = (formId: string) => {
    const form = eventForms.find(f => f.id === formId)
    if (!form?.activeVersion?.schema?.fields) return []
    return form.activeVersion.schema.fields.filter(
      (f): f is FormField & { options: string[] } =>
        (f.type === "select" || f.type === "radio" || f.type === "checkbox") &&
        Array.isArray(f.options) &&
        f.options.length > 0
    )
  }

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

  // Count how many booths each company is assigned to
  const assignedBoothCountByCompany = new Map<string, number>()
  for (const b of booths) {
    if (b.company?.id) {
      assignedBoothCountByCompany.set(b.company.id, (assignedBoothCountByCompany.get(b.company.id) ?? 0) + 1)
    }
  }
  const availableCompanies = companies
    .filter(c => {
      const assignedCount = assignedBoothCountByCompany.get(c.id) ?? 0
      const hasExtraBooth = getCompanySubOptionAnyStatus(c, "Extra Booth") !== null
      const maxBooths = hasExtraBooth ? 2 : 1
      const isAtLimit = assignedCount >= maxBooths
      const isSelectedBoothCompany = selectedBooth?.company?.id === c.id
      return !isAtLimit || isSelectedBoothCompany
    })
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" }))

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

      {/* Form response filter - highlight booths by form field option (multiple filters) */}
      <div className="p-4 bg-white/95 backdrop-blur-md border rounded-lg shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-600" />
            <h3 className="font-semibold text-sm text-neutral-800">Highlight by form response</h3>
          </div>
          <Button variant="outline" size="sm" onClick={addFilter} disabled={formsLoading}>
            Add filter
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Add one or more filters. For each filter, select a form, a field with options, and an option value. Booths of companies that match any filter will be highlighted in green.
        </p>
        <div className="space-y-3">
          {filters.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No filters. Click &quot;Add filter&quot; to highlight booths by form responses.</p>
          ) : (
            filters.map((filter, idx) => {
              const optionFields = getOptionFieldsForForm(filter.formId)
              const selectedField = optionFields.find(f => f.name === filter.fieldName)
              return (
                <div key={idx} className="flex flex-wrap items-end gap-3 p-3 rounded-md bg-neutral-50 border">
                  <div className="space-y-2 min-w-[160px]">
                    <Label className="text-xs">Form</Label>
                    <Select
                      value={filter.formId || "__none__"}
                      onValueChange={(v) => updateFilter(idx, { formId: v === "__none__" ? "" : v })}
                      disabled={formsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select form..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {eventForms.map((f) => (
                          <Tooltip key={f.id}>
                            <TooltipTrigger asChild>
                              <SelectItem value={f.id}>{f.name}</SelectItem>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Slug: {f.slug}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 min-w-[160px]">
                    <Label className="text-xs">Field</Label>
                    <Select
                      value={filter.fieldName || "__none__"}
                      onValueChange={(v) => updateFilter(idx, { fieldName: v === "__none__" ? "" : v })}
                      disabled={!filter.formId || optionFields.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={optionFields.length === 0 ? "No option fields" : "Select field..."} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {optionFields.map((f) => (
                          <SelectItem key={f.name} value={f.name}>{f.label || f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 min-w-[160px]">
                    <Label className="text-xs">Option value</Label>
                    <Select
                      value={filter.optionValue || "__none__"}
                      onValueChange={(v) => updateFilter(idx, { optionValue: v === "__none__" ? "" : v })}
                      disabled={!filter.fieldName}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select option..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {(selectedField?.options ?? []).map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeFilter(idx)} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )
            })
          )}
        </div>
        {filters.some(f => f.formVersionId && f.fieldName && f.optionValue) && (
          <p className="text-xs text-muted-foreground mt-2">
            {filterLoading ? "Loading..." : `${matchedCompanyIds.size} companies match (any filter)`}
          </p>
        )}
      </div>

      {/* Floorplan */}
      <div className="flex justify-center w-full px-2 sm:px-4 pb-4">
        <div className="w-full max-w-full min-w-0">
          {svgContent ? (
            <svg
              ref={svgRef}
              viewBox={viewBox}
              className="w-full h-auto min-w-0"
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
                const isFormFilterMatch = matchedCompanyIds.size > 0 && !!booth.company?.id && matchedCompanyIds.has(booth.company.id)

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

                const fill = isFormFilterMatch
                  ? (isSelected ? "rgba(34,197,94,0.5)" : "rgba(34,197,94,0.25)")
                  : isSelected ? "rgba(0,51,102,0.4)" : hasCompany ? "rgba(0,51,102,0.15)" : "rgba(255,0,0,0.08)"
                const stroke = isFormFilterMatch ? "#16a34a" : isSelected ? "#003366" : hasCompany ? "#003366" : "#ff0000"

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

