'use client'

import { useEffect, useState, useRef } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import NextImage from "next/image"
import { fetchEventPagesAction } from "@/app/actions/events"
import { fetchFloorplanAction, fetchMastersAction } from "@/app/actions/features"
import type { CareerEventPage, Booth, Master, Company } from '@/lib/schema'
import { getDirectusImageUrl } from "@/components/Images"
import { slugifyCompanyName } from "@/lib/utils/slugify"
import { hasCompanyPageAccess } from "@/lib/utils/company-access"
import { usePageLayout } from '../../../layout'
import { Button } from "@/components/ui/button"
import { Clock, ArrowLeft, Users } from "lucide-react"
import { StudentMatchingSoftware } from "@/components/StudentMatchingSoftware"

export default function SubPage() {
  const { setHideLayoutHeader } = usePageLayout()
  const [page, setPage] = useState<CareerEventPage | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [allCategories, setAllCategories] = useState<Master[]>([])
  const [popupBooth, setPopupBooth] = useState<Booth | null>(null)
  const [booths, setBooths] = useState<Booth[]>([])
  const [flickerCompanyId, setFlickerCompanyId] = useState<string | null>(null)
  const [flickerState, setFlickerState] = useState(false)

  const params = useParams()
  const pathname = usePathname()
  const eventName = Array.isArray(params.eventName) ? params.eventName[0] : params.eventName
  const subPage = Array.isArray(params.subPage) ? params.subPage[0] : params.subPage
  const isFloorplanPage = pathname.endsWith("/floorplan")
  const isCompanyGuidePage = pathname.endsWith("/company-guide")
  const isMatchingSoftwarePage = subPage === "matching-software"

  // Hide layout header when rendering floorplan or company guide (matching software keeps header)
  useEffect(() => {
    setHideLayoutHeader(isFloorplanPage || isCompanyGuidePage)
    return () => setHideLayoutHeader(false)
  }, [isFloorplanPage, isCompanyGuidePage, setHideLayoutHeader])

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
            onBoothClick={setPopupBooth}
          />
          <Floorplan
            page={page}
            selectedCategories={selectedCategories}
            onBoothClick={setPopupBooth}
            setBooths={setBooths}
            flickerCompanyId={flickerCompanyId}
            flickerState={flickerState}
            categories={allCategories}
            setSelectedCategories={setSelectedCategories}
          />
        </>
      )}

      {!isFloorplanPage && isMatchingSoftwarePage && (
        <MatchingSoftwarePage
          page={page}
          eventName={eventName || ''}
        />
      )}

      {isCompanyGuidePage && page && (
        <CompanyGuidePage page={page} />
      )}

      {!isFloorplanPage && !isCompanyGuidePage && !isMatchingSoftwarePage && (
        <div className="p-10 text-center text-neutral-700">
          <h1 className="text-2xl font-semibold">Subpage</h1>
          <p className="mt-2 text-sm text-neutral-500">
            (This section is under construction.)
          </p>
        </div>
      )}

      {popupBooth?.company && (
        <Popup
          booth={popupBooth}
          onClose={() => setPopupBooth(null)}
          booths={booths.filter(b => b.company).sort((a, b) => (a.booth_number ?? 0) - (b.booth_number ?? 0))}
          onSelectBooth={setPopupBooth}
        />
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
  isCompanyGuide = false,
  onBoothClick,
}: {
  categories: Master[]
  selectedCategories: string[]
  setSelectedCategories: (cats: string[]) => void
  booths: Booth[]
  triggerFlicker: (companyId: string) => void
  eventName: string
  isCompanyGuide?: boolean
  onBoothClick?: (booth: Booth) => void
}) {
  const toggleCategory = (short_name: string) => {
    if (selectedCategories.includes(short_name)) {
      setSelectedCategories(selectedCategories.filter(c => c !== short_name))
    } else {
      setSelectedCategories([...selectedCategories, short_name])
    }
  }

  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const showSearchDropdown = !isCompanyGuide && (isFocused || searchTerm.trim().length > 0)
  const matchingCompanies = showSearchDropdown
    ? booths.filter(b => b.company)
      .filter(b => {
        const name = (b.company!.name ?? "").toLowerCase()
        const term = searchTerm.trim().toLowerCase()
        return term ? name.includes(term) : true
      })
      .sort((a, b) => (a.booth_number || 0) - (b.booth_number || 0))
    : []

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Isolate header, categories, and popups from browser zoom */
          .floorplan-header-isolated,
          .floorplan-categories-isolated,
          .floorplan-popup-isolated {
            position: fixed !important;
            z-index: 50 !important;
            /* Use viewport units for positioning */
            /* These should remain constant regardless of zoom */
          }
          
          .floorplan-header-isolated {
            top: 0.5rem !important;
            left: 0 !important;
            right: 0 !important;
            width: 100vw !important;
          }
          
          .floorplan-categories-isolated {
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100vw !important;
          }
          
          .floorplan-popup-isolated {
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 100 !important;
          }
          
          /* Prevent these elements from being affected by parent transforms */
          .floorplan-header-isolated *,
          .floorplan-categories-isolated *,
          .floorplan-popup-isolated * {
            transform: none !important;
          }
        `
      }} />
      <header 
        className="floorplan-header-isolated fixed top-2 sm:top-4 inset-x-0 z-50 w-full px-2 sm:px-0"
      >
        <div className="mx-auto max-w-7xl px-2 sm:px-4">
          {/* Mobile: Stack layout */}
          <div className="md:hidden flex flex-col gap-2">
            {/* Top row: Page label + VTK Jobfair + Home */}
            <div className="flex items-center justify-between gap-2 rounded-xl border bg-white/85 px-2 sm:px-3 py-1.5 sm:py-2 shadow-md ring-1 ring-black/5 backdrop-blur-md">
              <span className="text-xs font-semibold text-neutral-800">{isCompanyGuide ? 'Company page' : 'Floorplan'}</span>
              <div className="flex items-center gap-2">
                <Link
                  href={`/event/${eventName.toLowerCase().replace(/\s+/g, "-")}`}
                  className="rounded-full bg-vtk-blue px-2.5 py-1 text-xs font-medium text-white cursor-pointer whitespace-nowrap"
                >
                  {eventName}
                </Link>
                <Link
                  href="/"
                  className="rounded-full bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-800 cursor-pointer whitespace-nowrap"
                >
                  Home
                </Link>
              </div>
            </div>
            
            {/* Bottom row: Search (only for floorplan) - removed for company guide on mobile */}
            {!isCompanyGuide && (
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
                  {showSearchDropdown && (
                    <ul className="absolute top-full left-0 w-full mt-1 max-h-60 overflow-auto rounded-lg border bg-white shadow-lg z-50">
                      {matchingCompanies.length > 0 ? (
                        matchingCompanies.map(b => (
                          <li
                            key={b.id}
                            className="px-4 py-2 hover:bg-vtk-blue/10 cursor-pointer flex justify-between"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              triggerFlicker(b.company!.id)
                              onBoothClick?.(b)
                              setSearchTerm("")
                              setIsFocused(false)
                            }}
                          >
                            <span>{b.company!.name}</span>
                            <span className="text-gray-500">{String(b.booth_number)}</span>
                          </li>
                        ))
                      ) : (
                        <li className="px-4 py-3 text-sm text-neutral-500">No companies found</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Desktop: Horizontal layout */}
          <div className="hidden md:flex items-center justify-between gap-3 rounded-2xl border bg-white/85 px-5 py-3 shadow-md ring-1 ring-black/5 backdrop-blur-md">
            {/* Left: Page label + Home + Event */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-neutral-800">{isCompanyGuide ? 'Company page' : 'Floorplan'}</span>
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

            {/* Middle: Search bar (only for floorplan) or empty space (for company guide) */}
            {!isCompanyGuide && (
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
                {showSearchDropdown && (
                  <ul className="absolute top-full left-0 w-full mt-1 max-h-60 overflow-auto rounded-lg border bg-white shadow-lg z-50">
                    {matchingCompanies.length > 0 ? (
                      matchingCompanies.map(b => (
                        <li
                          key={b.id}
                          className="px-4 py-2 hover:bg-vtk-blue/10 cursor-pointer flex justify-between"
                          onClick={() => {
                            triggerFlicker(b.company!.id)
                            onBoothClick?.(b)
                            setSearchTerm("")
                            setIsFocused(false)
                          }}
                        >
                          <span>{b.company!.name}</span>
                          <span className="text-gray-500">{String(b.booth_number)}</span>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-3 text-sm text-neutral-500">No companies found</li>
                    )}
                  </ul>
                )}
              </div>
            )}

            {/* Right: Category logos (only for floorplan) or buttons (for company guide) */}
            {!isCompanyGuide && (
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
            )}
            {isCompanyGuide && (
              <div className="ml-auto flex items-center gap-2">
                <Button 
                  variant="outline" 
                  className="rounded-full border-vtk-blue text-vtk-blue hover:bg-vtk-blue/10" 
                  asChild
                >
                  <Link href="/student-login">Student Login</Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10" 
                  asChild
                >
                  <Link href="/login">Company Login</Link>
                </Button>
                <Button asChild className="rounded-full bg-vtk-blue hover:bg-vtk-blueDark">
                  <Link href="/contact">Contact Us</Link>
                </Button>
              </div>
            )}
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
  onBoothClick: (booth: Booth) => void
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
  const [originalViewBox, setOriginalViewBox] = useState<string>("0 0 1000 600")
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredBoothId, setHoveredBoothId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ companyName: string; x: number; y: number } | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  
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

  useEffect(() => {
    const loadData = async () => {
      if (!page) return
      const data = await fetchFloorplanAction(page)
      if (!data) return

      const boothsData = (data.booths || []).filter((b): b is Booth => b !== null)
      setBoothsLocal(boothsData)
      setBooths(boothsData)
      setBackgroundImage((data as any).backgroundImage || null)

      const rawSvg = data.svg || ""
      const parser = new DOMParser()
      const svgDoc = parser.parseFromString(rawSvg, "image/svg+xml")
      const svgRoot = svgDoc.documentElement
      const originalVb = svgRoot?.getAttribute("viewBox") || "0 0 1000 600"
      setSvgContent(rawSvg)
      setOriginalViewBox(originalVb)
      
      // Use original viewBox - keeps full floorplan visible and scrollable
      setViewBox(originalVb)
    }

    loadData()
  }, [page, setBooths])

  // Initialize refs with current state
  useEffect(() => {
    zoomStateRef.current = { zoom: mobileZoom, panX: mobilePan.x, panY: mobilePan.y }
  }, []) // Only on mount

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

  if (!svgContent) {
    return (
      <>
        <div className="pt-32 md:pt-[90px] flex justify-center items-center w-full min-h-[60vh]">
          <p className="text-neutral-600">Loading floorplan...</p>
        </div>
        {/* Mobile: Categories at bottom while loading */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t px-4 py-3 shadow-lg">
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
      {backgroundImage && (
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: `url(${getDirectusImageUrl(backgroundImage) || ""})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
      <div className={`pt-32 md:pt-[90px] flex justify-center w-full px-2 sm:px-4 pb-4 ${backgroundImage ? "relative z-10" : ""}`}>
        <div 
          ref={floorplanContainerRef}
          className="relative w-full max-w-full md:hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            touchAction: 'none',
            transform: `translate3d(${mobilePan.x / mobileZoom}px, ${mobilePan.y / mobileZoom}px, 0) scale(${mobileZoom})`,
            transformOrigin: 'center center',
            overflow: 'hidden',
            willChange: 'transform',
          }}
        >
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className="w-full h-auto min-w-0"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
          >
          {/* First: Render unselected white booths behind SVG */}
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

            // Only render unselected booths here (white background)
            if (isSelected) return null

            const origVbParts = originalViewBox.split(/\s+/).map(Number)
            if (origVbParts.length !== 4) return null
            const [origVbX, origVbY, origVbWidth, origVbHeight] = origVbParts

            const boothX = origVbX + (booth.coords.x_pct / 100) * origVbWidth
            const boothY = origVbY + (booth.coords.y_pct / 100) * origVbHeight
            const boothWidth = (booth.coords.width_pct / 100) * origVbWidth
            const boothHeight = (booth.coords.height_pct / 100) * origVbHeight
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

            const commonProps = {
              style: { cursor: "pointer" } as React.CSSProperties,
              onClick: () => onBoothClick(booth),
              onMouseEnter: (e: React.MouseEvent) => {
                setHoveredBoothId(booth.company!.id)
                setTooltip({ companyName: booth.company!.name, x: e.clientX, y: e.clientY })
              },
              onMouseLeave: () => { setHoveredBoothId(null); setTooltip(null) },
              onMouseMove: (e: React.MouseEvent) => {
                if (booth.company) setTooltip({ companyName: booth.company.name, x: e.clientX, y: e.clientY })
              },
            }

            return boothShape ? (
              <path
                key={`unselected-${i}`}
                d={boothShape}
                fill="white"
                stroke="#e5e7eb"
                strokeWidth={1}
                {...commonProps}
              />
            ) : (
              <rect
                key={`unselected-${i}`}
                x={boothX}
                y={boothY}
                width={boothWidth}
                height={boothHeight}
                fill="white"
                stroke="#e5e7eb"
                strokeWidth={1}
                {...commonProps}
              />
            )
          })}

          {/* Second: Floorplan SVG as image - preserves exact rendering (no white blocks, circles, or missing lines) */}
          {svgContent && (() => {
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
                style={{ pointerEvents: 'none' }}
              />
            )
          })()}

          {/* Third: Render selected booths on top */}
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

            // Only render selected booths here
            if (!isSelected) return null

            const origVbParts = originalViewBox.split(/\s+/).map(Number)
            if (origVbParts.length !== 4) return null
            const [origVbX, origVbY, origVbWidth, origVbHeight] = origVbParts

            const boothX = origVbX + (booth.coords.x_pct / 100) * origVbWidth
            const boothY = origVbY + (booth.coords.y_pct / 100) * origVbHeight
            const boothWidth = (booth.coords.width_pct / 100) * origVbWidth
            const boothHeight = (booth.coords.height_pct / 100) * origVbHeight
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

            const commonProps = {
              style: { cursor: "pointer" } as React.CSSProperties,
              onClick: () => onBoothClick(booth),
              onMouseEnter: (e: React.MouseEvent) => {
                setHoveredBoothId(booth.company!.id)
                setTooltip({ companyName: booth.company!.name, x: e.clientX, y: e.clientY })
              },
              onMouseLeave: () => { setHoveredBoothId(null); setTooltip(null) },
              onMouseMove: (e: React.MouseEvent) => {
                if (booth.company) setTooltip({ companyName: booth.company.name, x: e.clientX, y: e.clientY })
              },
            }

            return boothShape ? (
              <path
                key={`selected-${i}`}
                d={boothShape}
                fill="rgba(0,51,102,0.35)"
                stroke="#003366"
                strokeWidth={1}
                {...commonProps}
              />
            ) : (
              <rect
                key={`selected-${i}`}
                x={boothX}
                y={boothY}
                width={boothWidth}
                height={boothHeight}
                fill="rgba(0,51,102,0.35)"
                stroke="#003366"
                strokeWidth={1}
                {...commonProps}
              />
            )
          })}
          </svg>
        </div>
        
        {/* Desktop version without zoom */}
        <div className="hidden md:block relative w-full max-w-full">
          <svg
            viewBox={viewBox}
            className="w-full h-auto min-w-0"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
          >
          {/* First: Render unselected white booths behind SVG */}
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

            // Only render unselected booths here (white background)
            if (isSelected) return null

            const origVbParts = originalViewBox.split(/\s+/).map(Number)
            if (origVbParts.length !== 4) return null
            const [origVbX, origVbY, origVbWidth, origVbHeight] = origVbParts

            const boothX = origVbX + (booth.coords.x_pct / 100) * origVbWidth
            const boothY = origVbY + (booth.coords.y_pct / 100) * origVbHeight
            const boothWidth = (booth.coords.width_pct / 100) * origVbWidth
            const boothHeight = (booth.coords.height_pct / 100) * origVbHeight
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

            const commonProps = {
              style: { cursor: "pointer" } as React.CSSProperties,
              onClick: () => onBoothClick(booth),
              onMouseEnter: (e: React.MouseEvent) => {
                setHoveredBoothId(booth.company!.id)
                setTooltip({ companyName: booth.company!.name, x: e.clientX, y: e.clientY })
              },
              onMouseLeave: () => { setHoveredBoothId(null); setTooltip(null) },
              onMouseMove: (e: React.MouseEvent) => {
                if (booth.company) setTooltip({ companyName: booth.company.name, x: e.clientX, y: e.clientY })
              },
            }

            return boothShape ? (
              <path
                key={`unselected-desktop-${i}`}
                d={boothShape}
                fill="white"
                stroke="#e5e7eb"
                strokeWidth={1}
                {...commonProps}
              />
            ) : (
              <rect
                key={`unselected-desktop-${i}`}
                x={boothX}
                y={boothY}
                width={boothWidth}
                height={boothHeight}
                fill="white"
                stroke="#e5e7eb"
                strokeWidth={1}
                {...commonProps}
              />
            )
          })}

          {/* Second: Floorplan SVG as image - preserves exact rendering (no white blocks, circles, or missing lines) */}
          {svgContent && (() => {
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
                style={{ pointerEvents: 'none' }}
              />
            )
          })()}

          {/* Third: Render selected booths on top */}
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

            // Only render selected booths here
            if (!isSelected) return null

            const origVbParts = originalViewBox.split(/\s+/).map(Number)
            if (origVbParts.length !== 4) return null
            const [origVbX, origVbY, origVbWidth, origVbHeight] = origVbParts

            const boothX = origVbX + (booth.coords.x_pct / 100) * origVbWidth
            const boothY = origVbY + (booth.coords.y_pct / 100) * origVbHeight
            const boothWidth = (booth.coords.width_pct / 100) * origVbWidth
            const boothHeight = (booth.coords.height_pct / 100) * origVbHeight
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

            const commonProps = {
              style: { cursor: "pointer" } as React.CSSProperties,
              onClick: () => onBoothClick(booth),
              onMouseEnter: (e: React.MouseEvent) => {
                setHoveredBoothId(booth.company!.id)
                setTooltip({ companyName: booth.company!.name, x: e.clientX, y: e.clientY })
              },
              onMouseLeave: () => { setHoveredBoothId(null); setTooltip(null) },
              onMouseMove: (e: React.MouseEvent) => {
                if (booth.company) setTooltip({ companyName: booth.company.name, x: e.clientX, y: e.clientY })
              },
            }

            return boothShape ? (
              <path
                key={`selected-desktop-${i}`}
                d={boothShape}
                fill="rgba(0,51,102,0.35)"
                stroke="#003366"
                strokeWidth={1}
                {...commonProps}
              />
            ) : (
              <rect
                key={`selected-desktop-${i}`}
                x={boothX}
                y={boothY}
                width={boothWidth}
                height={boothHeight}
                fill="rgba(0,51,102,0.35)"
                stroke="#003366"
                strokeWidth={1}
                {...commonProps}
              />
            )
          })}
          </svg>
        </div>

        {/* Tooltip that follows mouse - shared for mobile and desktop */}
        {tooltip && (
          <div
            className="fixed pointer-events-none z-50 bg-neutral-900/80 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap"
            style={{
              left: `${tooltip.x + 8}px`,
              top: `${tooltip.y + 8}px`,
            }}
          >
            {tooltip.companyName}
          </div>
        )}
      </div>

      {/* Company List */}
      <CompanyList 
        booths={boothsLocal}
        selectedCategories={selectedCategories}
        onBoothClick={onBoothClick}
      />

      {/* Mobile: Categories at bottom */}
      <div className="floorplan-categories-isolated md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t px-4 py-3 shadow-lg">
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

// ---------------- Company List ----------------
function CompanyList({
  booths,
  selectedCategories,
  onBoothClick,
}: {
  booths: Booth[]
  selectedCategories: string[]
  onBoothClick: (booth: Booth) => void
}) {
  // Filter booths that have companies, sort alphabetically, then limit to max 2 entries per company (double booths)
  const allEntries = booths
    .filter(b => b.company && b.booth_number)
    .map(b => ({
      company: b.company!,
      boothNumber: b.booth_number!,
      boothId: b.id,
    }))
    .sort((a, b) => a.boothNumber - b.boothNumber)
  // Limit to at most 2 entries per company (double booths only show twice)
  const companyCount = new Map<string, number>()
  const companiesWithBooths = allEntries.filter(({ company }) => {
    const count = (companyCount.get(company.id) ?? 0) + 1
    companyCount.set(company.id, count)
    return count <= 2
  })

  if (companiesWithBooths.length === 0) {
    return null
  }

  // Check if a company has ALL selected categories (same logic as floorplan)
  const hasSelectedCategory = (company: Company) => {
    if (selectedCategories.length === 0) return false
    
    const companyCats: Master[] = Array.isArray(company.category)
      ? company.category.filter((c): c is Master => c !== null)
      : []
    
    // Company must have ALL selected categories (exact same logic as floorplan)
    return selectedCategories.every(cat =>
      companyCats.map(c => c.short_name).includes(cat)
    )
  }

  return (
    <div className="w-full px-2 sm:px-4 pb-4 relative z-10">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4 mt-6">
          Companies ({companiesWithBooths.length})
        </h2>
        <div 
          className="gap-3"
          style={{
            columnCount: 1,
            columnGap: '0.75rem',
          }}
        >
          <style dangerouslySetInnerHTML={{
            __html: `
              @media (min-width: 640px) {
                .company-list-columns {
                  column-count: 2 !important;
                }
              }
              @media (min-width: 768px) {
                .company-list-columns {
                  column-count: 3 !important;
                }
              }
              @media (min-width: 1024px) {
                .company-list-columns {
                  column-count: 4 !important;
                }
              }
              .company-list-columns > * {
                break-inside: avoid;
                margin-bottom: 0.75rem;
              }
            `
          }} />
          <div className="company-list-columns">
          {companiesWithBooths.map(({ company, boothNumber, boothId }) => {
            const isHighlighted = hasSelectedCategory(company)
            
            return (
              <CompanyListItem
                key={boothId}
                company={company}
                boothNumber={boothNumber}
                boothId={boothId}
                booths={booths}
                isHighlighted={isHighlighted}
                onBoothClick={onBoothClick}
              />
            )
          })}
          </div>
        </div>
      </div>
    </div>
  )
}

function CompanyListItem({
  company,
  boothNumber,
  boothId,
  booths,
  isHighlighted,
  onBoothClick,
}: {
  company: Company
  boothNumber: number
  boothId: string
  booths: Booth[]
  isHighlighted: boolean
  onBoothClick: (booth: Booth) => void
}) {
  const booth = booths.find(b => b.id === boothId)
  return (
    <button
      onClick={() => booth && onBoothClick(booth)}
      className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
        isHighlighted
          ? 'border-vtk-blue font-bold'
          : 'bg-white border-neutral-200 hover:border-vtk-blue/50 hover:bg-neutral-50'
      }`}
      style={{
        backgroundColor: isHighlighted ? 'rgba(147, 166, 193, 1)' : 'white',
      }}
    >
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${isHighlighted ? 'font-bold text-black' : 'font-medium text-neutral-900'}`}>
          {company.name}
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          Booth {boothNumber}
        </div>
      </div>
    </button>
  )
}

// ---------------- Popup ----------------
function CompanyGuidePage({ page }: { page: CareerEventPage }) {
  // Get company guide file ID
  const companyGuide = page.company_guide
  const fileId = !companyGuide 
    ? null 
    : typeof companyGuide === 'string' 
      ? companyGuide 
      : (companyGuide as { id?: string })?.id || null
  
  // Use API route to proxy PDF to avoid CORS issues
  const pdfUrl = fileId 
    ? `/api/pdf-proxy?fileId=${fileId}`
    : null

  if (!pdfUrl) {
    return (
      <div className="p-10 text-center text-neutral-700">
        <h1 className="text-2xl font-semibold">Company Guide</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Company guide not available.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-vtk-bg">
      <Header
        categories={[]}
        selectedCategories={[]}
        setSelectedCategories={() => {}}
        booths={[]}
        triggerFlicker={() => {}}
        eventName={page.event.name}
        isCompanyGuide={true}
      />
      <PDFViewer pdfUrl={pdfUrl} />
    </div>
  )
}

// ---------------- PDF Viewer Component ----------------
// Use iframe for perfect PDF rendering with CSS to hide internal scrollbar
function PDFViewer({ pdfUrl }: { pdfUrl: string }) {
  return (
    <>
      {/* CSS to completely hide PDF viewer scrollbars */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Hide all scrollbars in PDF iframe */
          .pdf-iframe-container iframe {
            overflow: hidden !important;
            scrollbar-width: none !important; /* Firefox */
            -ms-overflow-style: none !important; /* IE/Edge */
          }
          
          /* Hide scrollbars in WebKit browsers */
          .pdf-iframe-container iframe::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
          }
          
          /* Hide scrollbar track and thumb */
          .pdf-iframe-container iframe::-webkit-scrollbar-track,
          .pdf-iframe-container iframe::-webkit-scrollbar-thumb {
            display: none !important;
          }
          
          /* Additional CSS to hide PDF.js scrollbars if present */
          .pdf-iframe-container iframe body,
          .pdf-iframe-container iframe body * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          
          .pdf-iframe-container iframe body::-webkit-scrollbar,
          .pdf-iframe-container iframe body *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          
          /* Make iframe content scrollable but hide scrollbar */
          .pdf-iframe-container iframe {
            pointer-events: auto !important;
          }
        `
      }} />
      <div className="pt-24 pb-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden pdf-iframe-container">
            {/* Use iframe with very large height to make it part of page flow */}
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              className="w-full border-0"
              style={{ 
                minHeight: '800px',
                height: '20000px', // Very large height to avoid internal scrollbar
                display: 'block',
                overflow: 'hidden',
                border: 'none',
                pointerEvents: 'auto',
              }}
              title="Company Guide PDF"
              scrolling="no"
            />
          </div>
        </div>
      </div>
    </>
  )
}

function MatchingSoftwarePage({ page, eventName }: { page: CareerEventPage | null; eventName: string }) {
  const [student, setStudent] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/check?' + Date.now(), { cache: 'no-store', credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data?.student?.authenticated === true && data?.student?.id) {
          setStudent({ id: data.student.id })
        } else {
          setStudent(null)
        }
      })
      .catch(() => setStudent(null))
      .finally(() => setLoading(false))
  }, [])

  const eventSlug = (page?.event?.name || eventName).toLowerCase().replace(/\s+/g, "-")
  const eventId = (page?.event as { id?: string })?.id

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-vtk-blue/5 via-white to-vtk-yellow/5 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-neutral-900 mb-4">Matching Software</h1>
          <p className="text-lg text-neutral-600 mb-8">
            You need to be logged in as a student to access the matching software.
          </p>
          <Button asChild className="rounded-full bg-vtk-blue text-white">
            <Link href={`/student-login?redirectTo=${encodeURIComponent(`/event/${eventSlug}/matching-software`)}`}>
              Student Login
            </Link>
          </Button>
          <div className="mt-6">
            <Button asChild variant="outline">
              <Link href={`/event/${eventSlug}`}>Back to event</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!eventId) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-muted-foreground">Event not found.</p>
      </div>
    )
  }

  return (
    <StudentMatchingSoftware
      eventId={eventId}
      eventName={page?.event?.name || eventName}
      studentId={student.id}
    />
  )
}

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

function Popup({ booth, onClose, booths, onSelectBooth }: { booth: Booth; onClose: () => void; booths: Booth[]; onSelectBooth: (b: Booth) => void }) {
  const company = booth.company!
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

  // Get company categories/masters
  const companyCategories: Master[] = Array.isArray(company.category)
    ? company.category.filter((c): c is Master => c !== null)
    : []

  return (
    <div
      className="floorplan-popup-isolated fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl bg-white text-neutral-900 px-8 py-6 shadow-2xl max-w-3xl w-full mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-3 right-3 text-neutral-600 font-semibold text-sm">
          Booth {booth.booth_number}
        </div>
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

        {companyCategories.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            {companyCategories.map(cat => (
              <div
                key={cat.id}
                className="relative w-10 h-10 rounded-full overflow-hidden border border-neutral-300 flex items-center justify-center bg-white"
              >
                {cat.logo && (
                  <NextImage
                    src={getDirectusImageUrl(cat.logo) ?? ''}
                    alt={cat.short_name}
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                )}
              </div>
            ))}
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