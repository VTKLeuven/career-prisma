"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import NextImage from "next/image"
import type { Booth, Company, Master } from "@/lib/schema"
import type { PublicFloorplan } from "@/lib/floorplan-data"
import { getFileUrl } from "@/components/Images"
import { extractLogoId } from "@/lib/utils/master-degree-options"
import { slugifyCompanyName } from "@/lib/utils/slugify"
import { hasCompanyPageAccess } from "@/lib/utils/company-access"
import { usePageLayout } from "../../../layout"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CompanyLikeButton } from "@/components/CompanyLikeButton"
import { useStudentLikedCompanies } from "@/providers/StudentLikedCompaniesProvider"
import { SubPageHeader } from "./sub-page-header"

const DESKTOP_QUERY = "(min-width: 768px)"

function subscribeDesktop(onChange: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

/**
 * Whether the viewport is md+ -- false on the server and during hydration.
 * Lets the floorplan mount one SVG and attach touch zoom only on mobile,
 * instead of rendering a mobile and a desktop copy and hiding one with CSS.
 */
function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false
  )
}

/**
 * The public floorplan. Everything it shows arrives from the server in
 * `floorplan` (see loadPublicFloorplan); only the student's liked companies
 * are loaded in the browser, by StudentLikedCompaniesProvider.
 */
export function FloorplanView({
  eventName,
  eventSlug,
  floorplan,
  matching,
}: {
  eventName: string
  eventSlug: string
  floorplan: Omit<PublicFloorplan, "svg">
  matching: { matchedIds: string[]; hasMatchingSoftware: boolean }
}) {
  const { setHideLayoutHeader } = usePageLayout()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isStudent, likedIds: likedCompanyIds } = useStudentLikedCompanies()

  const {
    booths,
    useFormCategories,
    formCategoryGroups,
    categories,
    companyCategoryValues,
    companyNames: companyNamesByCompanyId,
    companyLogos: companyLogosByCompanyId,
  } = floorplan

  const matchedCompanyIdsFromMatching = useMemo(() => new Set(matching.matchedIds), [matching.matchedIds])
  const hasMatchingSoftware = matching.hasMatchingSoftware

  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  // Returning from the matching software with ?showMatches=true: start filtered.
  const [showOnlyMyMatches, setShowOnlyMyMatches] = useState(
    () => searchParams.get("showMatches") === "true" && matching.matchedIds.length > 0
  )
  const [showOnlyMyLiked, setShowOnlyMyLiked] = useState(false)
  // Returning from a login with ?popupBooth=<id>: reopen that booth.
  const [popupBooth, setPopupBooth] = useState<Booth | null>(() => {
    const id = searchParams.get("popupBooth")
    return id ? booths.find((b) => String(b.id) === id && b.company) ?? null : null
  })
  const [flickerCompanyId, setFlickerCompanyId] = useState<string | null>(null)
  const [flickerState, setFlickerState] = useState(false)

  // The floorplan renders its own fixed header.
  useEffect(() => {
    setHideLayoutHeader(true)
    return () => setHideLayoutHeader(false)
  }, [setHideLayoutHeader])

  // Form-based category filter, worked out in the browser from each company's
  // values: a company matches when it has every selected value.
  const matchedCompanyIdsForm = useMemo(() => {
    const selected = selectedCategories.map((v) => v.trim()).filter(Boolean)
    if (!useFormCategories || selected.length === 0) return new Set<string>()
    const ids = new Set<string>()
    for (const [companyId, values] of Object.entries(companyCategoryValues)) {
      if (selected.every((sel) => values.includes(sel))) ids.add(companyId)
    }
    return ids
  }, [useFormCategories, selectedCategories, companyCategoryValues])

  // The login round trips above leave their flags in the URL; drop them once
  // they have been applied so a reload does not apply them again.
  useEffect(() => {
    // ?showLiked is left for the effect below, which needs the liked companies first.
    if ((searchParams.get("showMatches") || searchParams.get("popupBooth")) && !searchParams.get("showLiked")) {
      router.replace(pathname, { scroll: false })
    }
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Returning from a student login with ?showLiked=true: turn on "My liked"
  // once the liked companies have loaded in the browser.
  useEffect(() => {
    if (searchParams.get("showLiked") !== "true") return
    if (isStudent === true && likedCompanyIds.size > 0) {
      setShowOnlyMyLiked(true)
      setShowOnlyMyMatches(false)
      setSelectedCategories([])
      router.replace(pathname, { scroll: false })
    }
  }, [searchParams, isStudent, likedCompanyIds.size, pathname, router])

  // Flicker effect
  const flickerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const triggerFlicker = useCallback((companyId: string) => {
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
  }, [])

  useEffect(() => () => {
    if (flickerIntervalRef.current) clearInterval(flickerIntervalRef.current)
  }, [])

  const sortedCompanyBooths = useMemo(
    () => booths.filter(b => b.company).sort((a, b) => (a.booth_number ?? 0) - (b.booth_number ?? 0)),
    [booths]
  )

  return (
    <div className="min-h-svh bg-vtk-bg text-neutral-900">
      <SubPageHeader
        categories={categories}
        formCategoryGroups={formCategoryGroups}
        useFormCategories={useFormCategories}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        booths={booths}
        triggerFlicker={triggerFlicker}
        eventName={eventName}
        onBoothClick={setPopupBooth}
        companyNamesByCompanyId={companyNamesByCompanyId}
        matchedCompanyIdsFromMatching={matchedCompanyIdsFromMatching}
        showOnlyMyMatches={showOnlyMyMatches}
        setShowOnlyMyMatches={setShowOnlyMyMatches}
        hasMatchingSoftware={hasMatchingSoftware}
        isStudent={isStudent}
        showOnlyMyLiked={showOnlyMyLiked}
        setShowOnlyMyLiked={setShowOnlyMyLiked}
      />
      <Floorplan
        svgUrl={getFileUrl(floorplan.svgFileId) ?? ""}
        viewBox={floorplan.viewBox}
        backgroundImage={floorplan.backgroundImage}
        booths={booths}
        eventSlug={eventSlug}
        selectedCategories={selectedCategories}
        onBoothClick={setPopupBooth}
        flickerCompanyId={flickerCompanyId}
        flickerState={flickerState}
        categories={categories}
        formCategoryGroups={formCategoryGroups}
        useFormCategories={useFormCategories}
        matchedCompanyIdsForm={matchedCompanyIdsForm}
        setSelectedCategories={setSelectedCategories}
        companyNamesByCompanyId={companyNamesByCompanyId}
        matchedCompanyIdsFromMatching={matchedCompanyIdsFromMatching}
        showOnlyMyMatches={showOnlyMyMatches}
        setShowOnlyMyMatches={setShowOnlyMyMatches}
        hasMatchingSoftware={hasMatchingSoftware}
        likedCompanyIds={likedCompanyIds}
        isStudent={isStudent}
        showOnlyMyLiked={showOnlyMyLiked}
        setShowOnlyMyLiked={setShowOnlyMyLiked}
      />

      {popupBooth?.company && (
        <Popup
          booth={popupBooth}
          onClose={() => setPopupBooth(null)}
          booths={sortedCompanyBooths}
          onSelectBooth={setPopupBooth}
          useFormLogos={useFormCategories}
          companyNamesByCompanyId={companyNamesByCompanyId}
          companyLogosByCompanyId={companyLogosByCompanyId}
        />
      )}
    </div>
  )
}

// ---------------- Floorplan ----------------
function Floorplan({
  svgUrl,
  viewBox,
  backgroundImage,
  booths,
  eventSlug,
  selectedCategories,
  onBoothClick,
  flickerCompanyId,
  flickerState,
  categories,
  formCategoryGroups,
  useFormCategories,
  matchedCompanyIdsForm,
  setSelectedCategories,
  companyNamesByCompanyId,
  matchedCompanyIdsFromMatching,
  showOnlyMyMatches,
  setShowOnlyMyMatches,
  hasMatchingSoftware,
  likedCompanyIds,
  isStudent,
  showOnlyMyLiked,
  setShowOnlyMyLiked,
}: {
  svgUrl: string
  viewBox: string
  backgroundImage: string | null
  booths: Booth[]
  eventSlug: string
  selectedCategories: string[]
  onBoothClick: (booth: Booth) => void
  flickerCompanyId: string | null
  flickerState: boolean
  categories: Master[]
  formCategoryGroups: PublicFloorplan["formCategoryGroups"]
  useFormCategories: boolean
  matchedCompanyIdsForm: Set<string>
  setSelectedCategories: (cats: string[]) => void
  companyNamesByCompanyId: Record<string, string>
  matchedCompanyIdsFromMatching: Set<string>
  showOnlyMyMatches: boolean
  setShowOnlyMyMatches: (v: boolean) => void
  hasMatchingSoftware: boolean
  likedCompanyIds: Set<string>
  isStudent: boolean | null
  showOnlyMyLiked: boolean
  setShowOnlyMyLiked: (v: boolean) => void
}) {
  const isDesktop = useIsDesktop()

  const handleMyLikedClick = () => {
    setShowOnlyMyLiked(!showOnlyMyLiked)
  }

  const toggleCategory = (val: string) => {
    if (selectedCategories.includes(val)) {
      setSelectedCategories(selectedCategories.filter(c => c !== val))
    } else {
      setSelectedCategories([...selectedCategories, val])
    }
  }

  const handleMasterSelect = (v: string) => {
    setSelectedCategories(v === "__none__" ? [] : [v])
  }

  const handleMyMatchesClick = () => {
    setShowOnlyMyMatches(!showOnlyMyMatches)
  }

  // Mobile zoom state - use refs for values that don't need re-renders
  const [mobileZoom, setMobileZoom] = useState(1)
  const [mobilePan, setMobilePan] = useState({ x: 0, y: 0 })
  const floorplanContainerRef = useRef<HTMLDivElement>(null)
  const lastTapTime = useRef<number>(0)
  const zoomStateRef = useRef({ zoom: 1, panX: 0, panY: 0 })
  const lastTouchDistanceRef = useRef<number | null>(null)
  const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null)
  const isPanningRef = useRef(false)
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null)
  const rafIdRef = useRef<number | null>(null)

  // Memoize booth overlay data to avoid recalculating on every render
  // isLikedHighlight takes precedence over isCategorySelected for coloring (yellow > blue)
  const boothOverlayData = useMemo(() => {
    const origVbParts = viewBox.split(/\s+/).map(Number)
    if (origVbParts.length !== 4) return []
    const [origVbX, origVbY, origVbWidth, origVbHeight] = origVbParts
    return booths
      .filter((b): b is Booth => !!b.coords && !!b.company)
      .map((booth) => {
        const isLikedHighlight = showOnlyMyLiked && !!booth.company?.id && likedCompanyIds.has(String(booth.company.id))
        const isCategorySelected = showOnlyMyMatches
          ? !!booth.company?.id && matchedCompanyIdsFromMatching.has(String(booth.company.id))
          : useFormCategories
            ? selectedCategories.length > 0 && !!booth.company?.id && matchedCompanyIdsForm.has(String(booth.company.id))
            : (() => {
                const boothCats: Master[] = Array.isArray(booth.company?.category)
                  ? booth.company!.category!.filter((c): c is Master => c !== null)
                  : []
                return selectedCategories.length > 0 && selectedCategories.every(cat =>
                  boothCats.map(c => c.short_name).includes(cat)
                )
              })()
        const isFlicker = flickerCompanyId === booth.company!.id && flickerState
        const isSelected = isFlicker || (!flickerCompanyId && (isLikedHighlight || isCategorySelected))
        const boothX = origVbX + (booth.coords!.x_pct / 100) * origVbWidth
        const boothY = origVbY + (booth.coords!.y_pct / 100) * origVbHeight
        const boothWidth = (booth.coords!.width_pct / 100) * origVbWidth
        const boothHeight = (booth.coords!.height_pct / 100) * origVbHeight
        const rotation = (booth.coords as { rotation_deg?: number }).rotation_deg
        const boothCx = boothX + boothWidth / 2
        const boothCy = boothY + boothHeight / 2
        const boothShape = rotation != null && Math.abs(rotation) > 0.5
          ? (() => {
              const rad = (rotation * Math.PI) / 180
              const c = Math.cos(rad)
              const s = Math.sin(rad)
              const hw = boothWidth / 2
              const hh = boothHeight / 2
              return `M ${boothCx + (-hw * c + hh * s)} ${boothCy + (-hw * s - hh * c)} L ${boothCx + (hw * c + hh * s)} ${boothCy + (hw * s - hh * c)} L ${boothCx + (hw * c - hh * s)} ${boothCy + (hw * s + hh * c)} L ${boothCx + (-hw * c - hh * s)} ${boothCy + (-hw * s + hh * c)} Z`
            })()
          : null
        return { booth, boothX, boothY, boothWidth, boothHeight, boothShape, isSelected, isLikedHighlight }
      })
  }, [booths, viewBox, useFormCategories, selectedCategories, matchedCompanyIdsForm, matchedCompanyIdsFromMatching, showOnlyMyMatches, likedCompanyIds, showOnlyMyLiked, flickerCompanyId, flickerState])

  const viewBoxParts = useMemo(() => viewBox.split(/\s+/).map(Number), [viewBox])

  const boothsById = useMemo(() => new Map(booths.map((b) => [String(b.id), b])), [booths])

  // The tooltip is moved by writing to its DOM node, not through state: a
  // state update per mouse move re-rendered every booth on the floorplan.
  const tooltipRef = useRef<HTMLDivElement>(null)
  const showTooltip = useCallback((text: string, x: number, y: number) => {
    const el = tooltipRef.current
    if (!el) return
    if (el.textContent !== text) el.textContent = text
    el.style.transform = `translate(${x + 8}px, ${y + 8}px)`
    el.style.display = "block"
  }, [])
  const hideTooltip = useCallback(() => {
    if (tooltipRef.current) tooltipRef.current.style.display = "none"
  }, [])

  // One delegated handler for all booths instead of a closure per booth.
  const boothFromEvent = (e: React.SyntheticEvent): Booth | undefined => {
    const id = (e.target as Element).closest?.("[data-booth]")?.getAttribute("data-booth")
    return id ? boothsById.get(id) : undefined
  }
  const handleSvgClick = (e: React.MouseEvent) => {
    const booth = boothFromEvent(e)
    if (booth) onBoothClick(booth)
  }
  const handleSvgMouseMove = (e: React.MouseEvent) => {
    const booth = boothFromEvent(e)
    if (!booth?.company) return hideTooltip()
    showTooltip(companyNamesByCompanyId[booth.company.id] ?? booth.company.name, e.clientX, e.clientY)
  }

  // Calculate distance between two touch points
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Calculate center point between two touches
  const getTouchCenter = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    }
  }

  // Update transform directly on DOM for performance (only during touch)
  const updateTransform = useRef(() => {
    if (floorplanContainerRef.current) {
      const { zoom, panX, panY } = zoomStateRef.current
      // Use translate3d for GPU acceleration
      floorplanContainerRef.current.style.transform = `translate3d(${panX / zoom}px, ${panY / zoom}px, 0) scale(${zoom})`
    }
  }).current

  // Sync ref state to React state (called at end of gesture)
  const syncState = useRef(() => {
    const { zoom, panX, panY } = zoomStateRef.current
    setMobileZoom(zoom)
    setMobilePan({ x: panX, y: panY })
  }).current

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }

    if (e.touches.length === 1) {
      // Single touch - prepare for panning
      const touch = e.touches[0]
      if (floorplanContainerRef.current) {
        const rect = floorplanContainerRef.current.getBoundingClientRect()
        lastPanPointRef.current = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top
        }
        isPanningRef.current = zoomStateRef.current.zoom > 1
      }
      
      // Double tap to zoom
      const now = Date.now()
      const timeSinceLastTap = now - lastTapTime.current
      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        // Double tap detected
        if (zoomStateRef.current.zoom === 1) {
          zoomStateRef.current.zoom = 2
          zoomStateRef.current.panX = 0
          zoomStateRef.current.panY = 0
        } else {
          zoomStateRef.current.zoom = 1
          zoomStateRef.current.panX = 0
          zoomStateRef.current.panY = 0
        }
        updateTransform()
        syncState()
        lastTapTime.current = 0
      } else {
        lastTapTime.current = now
      }
    } else if (e.touches.length === 2) {
      // Two touches - prepare for pinch zoom
      isPanningRef.current = false
      const distance = getTouchDistance(e.touches[0], e.touches[1])
      lastTouchDistanceRef.current = distance
      const center = getTouchCenter(e.touches[0], e.touches[1])
      if (floorplanContainerRef.current) {
        const rect = floorplanContainerRef.current.getBoundingClientRect()
        lastTouchCenterRef.current = {
          x: center.x - rect.left,
          y: center.y - rect.top
        }
      }
    }
  }

  // Handle touch move - use requestAnimationFrame for smooth updates
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault() // Prevent scrolling while zooming/panning
    
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
    }

    rafIdRef.current = requestAnimationFrame(() => {
      if (e.touches.length === 1 && isPanningRef.current && zoomStateRef.current.zoom > 1) {
        // Single touch panning (only when zoomed)
        const touch = e.touches[0]
        if (floorplanContainerRef.current && lastPanPointRef.current) {
          const rect = floorplanContainerRef.current.getBoundingClientRect()
          const currentX = touch.clientX - rect.left
          const currentY = touch.clientY - rect.top
          
          const deltaX = currentX - lastPanPointRef.current.x
          const deltaY = currentY - lastPanPointRef.current.y
          
          // Constrain pan to prevent going too far off screen
          const maxPan = 200 * zoomStateRef.current.zoom
          zoomStateRef.current.panX = Math.max(-maxPan, Math.min(maxPan, zoomStateRef.current.panX + deltaX))
          zoomStateRef.current.panY = Math.max(-maxPan, Math.min(maxPan, zoomStateRef.current.panY + deltaY))
          
          updateTransform()
          lastPanPointRef.current = { x: currentX, y: currentY }
        }
      } else if (e.touches.length === 2) {
        // Pinch zoom
        isPanningRef.current = false
        const distance = getTouchDistance(e.touches[0], e.touches[1])
        
        if (lastTouchDistanceRef.current !== null && lastTouchDistanceRef.current > 0 && lastTouchCenterRef.current) {
          const scaleChange = distance / lastTouchDistanceRef.current
          const newZoom = Math.max(1, Math.min(4, zoomStateRef.current.zoom * scaleChange))
          
          if (floorplanContainerRef.current) {
            const rect = floorplanContainerRef.current.getBoundingClientRect()
            const currentCenter = getTouchCenter(e.touches[0], e.touches[1])
            const centerX = currentCenter.x - rect.left
            const centerY = currentCenter.y - rect.top
            
            // Calculate pan adjustment to zoom towards touch center
            const zoomDelta = newZoom - zoomStateRef.current.zoom
            const panX = lastTouchCenterRef.current.x - centerX
            const panY = lastTouchCenterRef.current.y - centerY
            
            zoomStateRef.current.panX = zoomStateRef.current.panX - panX * (zoomDelta / zoomStateRef.current.zoom)
            zoomStateRef.current.panY = zoomStateRef.current.panY - panY * (zoomDelta / zoomStateRef.current.zoom)
            
            // Constrain pan
            const maxPan = 200 * newZoom
            zoomStateRef.current.panX = Math.max(-maxPan, Math.min(maxPan, zoomStateRef.current.panX))
            zoomStateRef.current.panY = Math.max(-maxPan, Math.min(maxPan, zoomStateRef.current.panY))
          }
          
          zoomStateRef.current.zoom = newZoom
          updateTransform()
        }
        
        lastTouchDistanceRef.current = distance
        const center = getTouchCenter(e.touches[0], e.touches[1])
        if (floorplanContainerRef.current) {
          const rect = floorplanContainerRef.current.getBoundingClientRect()
          lastTouchCenterRef.current = {
            x: center.x - rect.left,
            y: center.y - rect.top
          }
        }
      }
      
      rafIdRef.current = null
    })
  }

  // Handle touch end - sync state
  const handleTouchEnd = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    
    isPanningRef.current = false
    lastTouchDistanceRef.current = null
    lastTouchCenterRef.current = null
    lastPanPointRef.current = null
    
    // Sync ref state to React state
    syncState()
  }

  const renderBooth = (d: (typeof boothOverlayData)[number], selected: boolean) => {
    const fill = !selected ? "white" : d.isLikedHighlight ? "rgba(255,210,0,0.45)" : "rgba(0,51,102,0.35)"
    const stroke = !selected ? "#e5e7eb" : d.isLikedHighlight ? "#D4A017" : "#003366"
    const shared = {
      "data-booth": String(d.booth.id),
      fill,
      stroke,
      strokeWidth: 1,
      style: { cursor: "pointer" } as React.CSSProperties,
    }
    return d.boothShape ? (
      <path key={`${selected ? "selected" : "unselected"}-${d.booth.id}`} d={d.boothShape} {...shared} />
    ) : (
      <rect key={`${selected ? "selected" : "unselected"}-${d.booth.id}`} x={d.boothX} y={d.boothY} width={d.boothWidth} height={d.boothHeight} {...shared} />
    )
  }

  return (
    <>
      {backgroundImage && (
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: `url(${getFileUrl(backgroundImage) || ""})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
      <div className={`pt-32 md:pt-[90px] flex flex-col items-center w-full px-2 sm:px-4 pb-4 ${backgroundImage ? "relative z-10" : ""}`}>
        {/* One floorplan. On mobile it pinch-zooms and pans; on desktop it does not. */}
        <div
          ref={floorplanContainerRef}
          className="relative w-full max-w-full"
          onTouchStart={isDesktop ? undefined : handleTouchStart}
          onTouchMove={isDesktop ? undefined : handleTouchMove}
          onTouchEnd={isDesktop ? undefined : handleTouchEnd}
          style={isDesktop ? undefined : {
            touchAction: 'none',
            transform: `translate3d(${mobilePan.x / mobileZoom}px, ${mobilePan.y / mobileZoom}px, 0) scale(${mobileZoom})`,
            transformOrigin: 'center center',
            overflow: 'hidden',
            willChange: 'transform',
          }}
        >
          <svg
            viewBox={viewBox}
            className="w-full h-auto min-w-0"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
            onClick={handleSvgClick}
            onMouseMove={handleSvgMouseMove}
            onMouseLeave={hideTooltip}
          >
            {/* First: unselected white booths behind the floorplan drawing */}
            {boothOverlayData.filter(d => !d.isSelected).map(d => renderBooth(d, false))}

            {/* Second: the floorplan SVG as an image */}
            {svgUrl && viewBoxParts.length === 4 && (
              <image href={svgUrl} x={viewBoxParts[0]} y={viewBoxParts[1]} width={viewBoxParts[2]} height={viewBoxParts[3]} preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: 'none' }} />
            )}

            {/* Third: selected booths on top - yellow for liked, blue for category/matches */}
            {boothOverlayData.filter(d => d.isSelected).map(d => renderBooth(d, true))}
          </svg>
        </div>

        {/* Tooltip that follows the mouse; positioned by showTooltip(). */}
        <div
          ref={tooltipRef}
          className="fixed left-0 top-0 pointer-events-none z-50 bg-neutral-900/80 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap"
          style={{ display: "none" }}
        />
      </div>

      {/* Company List */}
      <CompanyList
        booths={booths}
        selectedCategories={selectedCategories}
        onBoothClick={onBoothClick}
        useFormCategories={useFormCategories}
        matchedCompanyIdsForm={matchedCompanyIdsForm}
        companyNamesByCompanyId={companyNamesByCompanyId}
        matchedCompanyIdsFromMatching={matchedCompanyIdsFromMatching}
        showOnlyMyMatches={showOnlyMyMatches}
        likedCompanyIds={likedCompanyIds}
        showOnlyMyLiked={showOnlyMyLiked}
      />

      {/* Mobile: Categories at bottom */}
      <div className="floorplan-categories-isolated md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t px-4 py-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {hasMatchingSoftware && (
            matchedCompanyIdsFromMatching.size > 0 ? (
              <button
                type="button"
                onClick={handleMyMatchesClick}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  showOnlyMyMatches
                    ? "bg-vtk-blue text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                My matches
              </button>
            ) : (
              <Link
                href={`/event/${eventSlug}/matching-software?redirectTo=${encodeURIComponent(`/event/${eventSlug}/floorplan?showMatches=true`)}`}
                className="shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
              >
                My matches
              </Link>
            )
          )}
          {isStudent === true ? (
            <button
              type="button"
              onClick={handleMyLikedClick}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                showOnlyMyLiked
                  ? "bg-vtk-yellow text-neutral-900"
                  : "bg-amber-200/70 text-neutral-700 hover:bg-amber-200"
              }`}
            >
              My liked
            </button>
          ) : isStudent === false && (
            <Link
              href={`/student-login?redirectTo=${encodeURIComponent(`/event/${eventSlug}/floorplan?showLiked=true`)}`}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap bg-amber-200/70 text-neutral-700 hover:bg-amber-200 transition-colors"
            >
              My liked
            </Link>
          )}
          {useFormCategories ? (
            <Select
              value={selectedCategories[0] ?? ""}
              onValueChange={handleMasterSelect}
            >
              <SelectTrigger className="w-full max-w-[280px]">
                <SelectValue placeholder="Select your master" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All</SelectItem>
                {formCategoryGroups.map((grp, idx) => (
                  <SelectGroup key={`${idx}-${grp.groupLabel}`}>
                    <SelectLabel>{grp.groupLabel}</SelectLabel>
                    {grp.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          ) : (
            categories.map(cat => {
              const isSelected = selectedCategories.includes(cat.short_name)
              return (
                <button
                  key={cat.short_name}
                  onClick={() => toggleCategory(cat.short_name)}
                  className="relative w-10 h-10 rounded-full overflow-hidden border-2 transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
                  style={{ borderColor: isSelected ? '#003366' : '#ccc' }}
                  aria-pressed={isSelected}
                  aria-label={cat.short_name}
                >
                  {cat.logo ? (
                    <NextImage
                      src={getFileUrl(cat.logo, { width: 72, height: 72 })!}
                      alt={cat.short_name}
                      width={36}
                      height={36}
                      sizes="36px"
                      loading="lazy"
                      className={`object-contain transition-all duration-200 transform ${
                        isSelected
                          ? 'scale-110 grayscale-0 opacity-100'
                          : 'scale-90 grayscale-[50%] opacity-70'
                      }`}
                    />
                  ) : (
                    <span className="text-[10px] font-semibold text-neutral-700">{cat.short_name}</span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}

// ---------------- Company List ----------------
// Memoised: the booth flicker re-renders the page every 500 ms for three
// seconds, and the list does not depend on it.
const CompanyList = memo(function CompanyList({
  booths,
  selectedCategories,
  onBoothClick,
  useFormCategories,
  matchedCompanyIdsForm,
  companyNamesByCompanyId,
  matchedCompanyIdsFromMatching,
  showOnlyMyMatches,
  likedCompanyIds,
  showOnlyMyLiked,
}: {
  booths: Booth[]
  selectedCategories: string[]
  onBoothClick: (booth: Booth) => void
  useFormCategories: boolean
  matchedCompanyIdsForm: Set<string>
  companyNamesByCompanyId: Record<string, string>
  matchedCompanyIdsFromMatching: Set<string>
  showOnlyMyMatches: boolean
  likedCompanyIds: Set<string>
  showOnlyMyLiked: boolean
}) {
  // Booths with a company, by booth number, at most 2 entries per company
  // (double booths show twice).
  const companiesWithBooths = useMemo(() => {
    const companyCount = new Map<string, number>()
    return booths
      .filter(b => b.company && b.booth_number)
      .sort((a, b) => a.booth_number! - b.booth_number!)
      .filter(b => {
        const count = (companyCount.get(b.company!.id) ?? 0) + 1
        companyCount.set(b.company!.id, count)
        return count <= 2
      })
  }, [booths])

  const uniqueCompanyCount = useMemo(
    () => new Set(companiesWithBooths.map(b => b.company!.id)).size,
    [companiesWithBooths]
  )

  if (companiesWithBooths.length === 0) {
    return null
  }

  // Check if a company matches any active filter (union when multiple filters on)
  const hasSelectedCategory = (company: Company) => {
    const isLiked = likedCompanyIds.has(String(company.id))
    const isMatch = matchedCompanyIdsFromMatching.has(String(company.id))
    const isCategoryMatch = useFormCategories
      ? !!company.id && matchedCompanyIdsForm.has(String(company.id))
      : (() => {
          const companyCats: Master[] = Array.isArray(company.category)
            ? company.category.filter((c): c is Master => c !== null)
            : []
          return selectedCategories.length > 0 && selectedCategories.every(cat =>
            companyCats.map(c => c.short_name).includes(cat)
          )
        })()
    return (showOnlyMyLiked && isLiked) || (showOnlyMyMatches && matchedCompanyIdsFromMatching.size > 0 && isMatch) || isCategoryMatch
  }

  return (
    <div className="w-full px-2 sm:px-4 pb-4 relative z-10">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4 mt-6">
          Companies ({uniqueCompanyCount})
        </h2>
        <div className="columns-1 gap-3 sm:columns-2 md:columns-3 lg:columns-4">
          {companiesWithBooths.map((booth) => {
            const company = booth.company!
            const isHighlighted = hasSelectedCategory(company)
            const isLikedHighlight = isHighlighted && likedCompanyIds.has(String(company.id))

            return (
              <CompanyListItem
                key={booth.id}
                booth={booth}
                isHighlighted={isHighlighted}
                isLikedHighlight={isLikedHighlight}
                onBoothClick={onBoothClick}
                displayName={companyNamesByCompanyId[company.id] ?? company.name}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
})

function CompanyListItem({
  booth,
  isHighlighted,
  isLikedHighlight,
  onBoothClick,
  displayName,
}: {
  booth: Booth
  isHighlighted: boolean
  isLikedHighlight: boolean
  onBoothClick: (booth: Booth) => void
  displayName: string
}) {
  const company = booth.company!
  const borderClass = isLikedHighlight ? 'border-amber-500' : isHighlighted ? 'border-vtk-blue font-bold' : 'border-neutral-200 hover:border-vtk-blue/50 hover:bg-neutral-50'
  const bgColor = isLikedHighlight ? 'rgba(255,210,0,0.35)' : isHighlighted ? 'rgba(147, 166, 193, 1)' : 'white'
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onBoothClick(booth)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onBoothClick(booth)
        }
      }}
      className={`relative mb-3 w-full break-inside-avoid text-left p-3 rounded-lg border transition-all cursor-pointer bg-white ${borderClass}`}
      style={{
        backgroundColor: bgColor,
      }}
    >
      <CompanyLikeButton companyId={company.id} compact />
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${isHighlighted ? 'font-bold text-black' : 'font-medium text-neutral-900'}`}>
          {displayName}
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          Booth {booth.booth_number}
        </div>
      </div>
    </div>
  )
}

// ---------------- Popup ----------------
function Popup({
  booth,
  onClose,
  booths,
  onSelectBooth,
  useFormLogos,
  companyNamesByCompanyId,
  companyLogosByCompanyId,
}: {
  booth: Booth
  onClose: () => void
  booths: Booth[]
  onSelectBooth: (b: Booth) => void
  /** Show master logos from the floorplan's category form instead of company masters. */
  useFormLogos: boolean
  companyNamesByCompanyId: Record<string, string>
  companyLogosByCompanyId: Record<string, string[]>
}) {
  const company = booth.company!
  const displayName = companyNamesByCompanyId[company.id] ?? company.name
  const formMasterLogos = companyLogosByCompanyId[company.id] ?? []

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (booths.length <= 1) return
      const idx = booths.findIndex(b => b.id === booth.id)
      if (idx < 0) return
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        const nextIdx = idx <= 0 ? booths.length - 1 : idx - 1
        onSelectBooth(booths[nextIdx])
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        const nextIdx = idx >= booths.length - 1 ? 0 : idx + 1
        onSelectBooth(booths[nextIdx])
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [booth.id, booths, onClose, onSelectBooth])

  const companyCategoryLogos: string[] = useFormLogos ? [] : (Array.isArray(company.category)
    ? [...new Set(company.category.filter((c): c is Master => c !== null).map(c => extractLogoId(c.logo)).filter((l): l is string => !!l))]
    : [])
  const displayLogos = useFormLogos ? formMasterLogos : companyCategoryLogos

  return (
    <div
      className="floorplan-popup-isolated fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl bg-white text-neutral-900 px-8 py-6 shadow-2xl max-w-3xl w-full mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <span className="text-neutral-600 font-semibold text-sm">
            Booth {booth.booth_number}
          </span>
          <CompanyLikeButton companyId={company.id} popupBoothId={String(booth.id)} inline />
        </div>
        {company.logo && (
          <div className="flex justify-center mb-4">
            <NextImage
              src={getFileUrl(company.logo) ?? ''}
              alt={displayName}
              width={100}
              height={80}
              className="object-contain"
            />
          </div>
        )}

        <h2 className="text-2xl font-semibold text-vtk-blue text-center mb-2">
          {displayName}
        </h2>

        {displayLogos.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            {displayLogos.map((logoId) => {
              const logoUrl = getFileUrl(logoId)
              if (!logoUrl) return null
              return (
                <div
                  key={logoId}
                  className="w-12 h-12 rounded-full overflow-hidden border border-neutral-200 flex items-center justify-center bg-white flex-shrink-0"
                >
                  <NextImage
                    src={logoUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="object-contain w-full h-full"
                  />
                </div>
              )
            })}
          </div>
        )}

        {company.short_description && (
          <div className="text-center">
            <div
              className="text-neutral-800 mt-2 prose prose-sm mx-auto"
              style={{ display: "inline-block", textAlign: "center" }}
              dangerouslySetInnerHTML={{ __html: company.short_description }}
            />
          </div>
        )}

        {hasCompanyPageAccess(company) && (
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href={`/company/${slugifyCompanyName(company.name)}`}
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
