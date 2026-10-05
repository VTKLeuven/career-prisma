"use client"

import { useState } from "react"
import Link from "next/link"
import NextImage from "next/image"
import type { Booth, Master } from "@/lib/schema"
import { getFileUrl } from "@/components/Images"
import { slugifyEventName } from "@/lib/utils/slugify"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * The fixed header of the floorplan and company-guide sub-pages: page label,
 * links home and to the event, and -- on the floorplan -- company search and
 * the category / "My matches" / "My liked" filters.
 */
export function SubPageHeader({
  categories,
  formCategoryGroups,
  useFormCategories,
  selectedCategories,
  setSelectedCategories,
  booths,
  triggerFlicker,
  eventName,
  isCompanyGuide = false,
  onBoothClick,
  companyNamesByCompanyId = {},
  matchedCompanyIdsFromMatching = new Set(),
  showOnlyMyMatches = false,
  setShowOnlyMyMatches,
  hasMatchingSoftware = false,
  isStudent = null,
  showOnlyMyLiked = false,
  setShowOnlyMyLiked,
}: {
  categories: Master[]
  formCategoryGroups: Array<{ groupLabel: string; options: Array<{ value: string; label: string; logo?: string }> }>
  useFormCategories: boolean
  selectedCategories: string[]
  setSelectedCategories: (cats: string[]) => void
  booths: Booth[]
  triggerFlicker: (companyId: string) => void
  eventName: string
  isCompanyGuide?: boolean
  onBoothClick?: (booth: Booth) => void
  companyNamesByCompanyId?: Record<string, string>
  matchedCompanyIdsFromMatching?: Set<string>
  showOnlyMyMatches?: boolean
  setShowOnlyMyMatches?: (v: boolean) => void
  hasMatchingSoftware?: boolean
  isStudent?: boolean | null
  showOnlyMyLiked?: boolean
  setShowOnlyMyLiked?: (v: boolean) => void
}) {
  const handleMyLikedClick = () => {
    setShowOnlyMyLiked?.(!showOnlyMyLiked)
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
    setShowOnlyMyMatches?.(!showOnlyMyMatches)
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const showSearchDropdown = !isCompanyGuide && (isFocused || searchTerm.trim().length > 0)
  const matchingCompanies = showSearchDropdown
    ? booths.filter(b => b.company)
      .filter(b => {
        const displayName = companyNamesByCompanyId[b.company!.id] ?? b.company!.name ?? ""
        const name = displayName.toLowerCase()
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
                  href={`/event/${slugifyEventName(eventName)}`}
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
                            <span>{companyNamesByCompanyId[b.company!.id] ?? b.company!.name}</span>
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
                href={`/event/${slugifyEventName(eventName)}`}
                className="text-sm font-semibold text-neutral-800 hover:text-vtk-blue cursor-pointer transition-colors"
              >
                {eventName}
              </Link>
            </div>

            {/* Middle: Search | My matches | Select (only for floorplan) */}
            {!isCompanyGuide && (
              <div className="flex flex-1 min-w-0 items-center gap-3 mx-4">
                <div className="relative flex-1 min-w-0">
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
                            <span>{companyNamesByCompanyId[b.company!.id] ?? b.company!.name}</span>
                            <span className="text-gray-500">{String(b.booth_number)}</span>
                          </li>
                        ))
                      ) : (
                        <li className="px-4 py-3 text-sm text-neutral-500">No companies found</li>
                      )}
                    </ul>
                  )}
                </div>
                {hasMatchingSoftware && (
                  matchedCompanyIdsFromMatching.size > 0 && setShowOnlyMyMatches ? (
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
                      href={`/event/${slugifyEventName(eventName)}/matching-software?redirectTo=${encodeURIComponent(`/event/${slugifyEventName(eventName)}/floorplan?showMatches=true`)}`}
                      className="shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                    >
                      My matches
                    </Link>
                  )
                )}
                {isStudent === true && setShowOnlyMyLiked ? (
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
                    href={`/student-login?redirectTo=${encodeURIComponent(`/event/${slugifyEventName(eventName)}/floorplan?showLiked=true`)}`}
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
                    <SelectTrigger className="flex-1 min-w-[180px] max-w-[320px]">
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
                  <div className="flex items-center gap-2">
                    {categories.map(cat => {
                      const isSelected = selectedCategories.includes(cat.short_name)
                      return (
                        <button
                          key={cat.short_name}
                          onClick={() => toggleCategory(cat.short_name)}
                          className="relative w-10 h-10 rounded-full overflow-hidden border transition-all duration-200 cursor-pointer flex items-center justify-center"
                          style={{ borderColor: isSelected ? '#003366' : '#ccc' }}
                        >
                          {cat.logo ? (
                            <NextImage
                              src={getFileUrl(cat.logo, { width: 64, height: 64 })!}
                              alt={cat.short_name}
                              width={32}
                              height={32}
                              sizes="32px"
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
                    })}
                  </div>
                )}
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

