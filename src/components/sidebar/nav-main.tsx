"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import type { ComponentType } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { IconAlertTriangle } from "@tabler/icons-react"

type NavIcon = ComponentType<{ className?: string }>

export type NavItem = {
  title: string
  url: string
  icon?: NavIcon
  isActive?: boolean
  badge?: number
  hasWarning?: boolean
  items?: {
    title: string
    url: string
    icon?: NavIcon
    badge?: number
    hasWarning?: boolean
    isActive?: boolean
  }[]
}

/** Shared look of every sidebar row (Dopl: 28px, 13px medium, 10px radius). */
export const navRowClass = cn(
  "group/nav flex h-7 w-full min-w-0 items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[13px] font-medium text-sidebar-foreground",
  "outline-none transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-sidebar-ring",
  "[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-[#3f3f46]",
  "hover:bg-[#f0f0f2]"
)

export const navRowActiveClass = "bg-sidebar-accent text-foreground hover:bg-sidebar-accent"

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto rounded-full bg-[#ebebfe] px-1.5 text-[11px] leading-4 font-semibold text-[#4840ac] tabular">
      {count}
    </span>
  )
}

function WarningIcon() {
  return (
    <IconAlertTriangle
      className="ml-auto h-3.5 w-3.5 shrink-0 text-red-600"
      title="Page background image has invalid dimensions"
    />
  )
}

const STORAGE_PREFIX = "nav-open:"

function readStoredOpen(key: string): boolean | null {
  try {
    const v = window.localStorage.getItem(STORAGE_PREFIX + key)
    return v === null ? null : v === "1"
  } catch {
    return null
  }
}

function storeOpen(key: string, open: boolean) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, open ? "1" : "0")
  } catch {
    /* storage can be unavailable (private mode); the default still works */
  }
}

function NavMainItem({ item, storageKey }: { item: NavItem; storageKey: string }) {
  const { isMobile, setOpenMobile } = useSidebar()
  // Events section should be collapsed by default
  const defaultOpen = item.title === "Events" ? false : Boolean(item.isActive || item.hasWarning)
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const hasWarningInSubItems = item.items?.some(subItem => subItem.hasWarning) ?? false
  const subBadgeTotal = item.items?.reduce((sum, s) => sum + (s.badge ?? 0), 0) ?? 0

  // Events: label navigates to dashboard, only arrow toggles collapsible
  const isEventsItem = item.title === "Events" && item.url === "/dashboard"

  // A group the user opened or closed by hand stays that way across pages; the
  // group of the current page is always opened so the active row is visible.
  useEffect(() => {
    const stored = readStoredOpen(storageKey)
    if (item.isActive) setIsOpen(true)
    else if (stored !== null) setIsOpen(stored)
  }, [item.isActive, storageKey])

  const onOpenChange = (open: boolean) => {
    setIsOpen(open)
    storeOpen(storageKey, open)
  }

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  if (item.items === undefined) {
    return (
      <li>
        <Link
          href={item.url}
          onClick={closeMobile}
          aria-current={item.isActive ? "page" : undefined}
          className={cn(navRowClass, item.isActive && navRowActiveClass)}
        >
          {item.icon && <item.icon />}
          <span className="truncate">{item.title}</span>
          {item.badge !== undefined && item.badge > 0 && <CountBadge count={item.badge} />}
        </Link>
      </li>
    )
  }

  const chevron = (
    <ChevronRight
      className={cn(
        "ml-auto !size-3.5 shrink-0 !text-[#a1a1aa] transition-transform duration-150",
        isOpen && "rotate-90"
      )}
    />
  )

  return (
    <Collapsible asChild open={isOpen} onOpenChange={onOpenChange}>
      <li>
        {isEventsItem ? (
          <div className={cn(navRowClass, "gap-0 p-0")}>
            <Link
              href={item.url}
              onClick={closeMobile}
              className="flex h-full min-w-0 flex-1 items-center gap-2.5 px-2.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-[#3f3f46]"
            >
              {item.icon && <item.icon />}
              <span className="truncate">{item.title}</span>
              {hasWarningInSubItems && !isOpen && <WarningIcon />}
            </Link>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex h-7 w-[34px] shrink-0 items-center justify-center rounded-[8px] hover:bg-black/5"
                aria-label={isOpen ? "Collapse Events" : "Expand Events"}
              >
                {chevron}
              </button>
            </CollapsibleTrigger>
          </div>
        ) : (
          <CollapsibleTrigger asChild>
            <button type="button" className={navRowClass}>
              {item.icon && <item.icon />}
              <span className="truncate">{item.title}</span>
              {hasWarningInSubItems && !isOpen && <WarningIcon />}
              {!isOpen && subBadgeTotal > 0 && <CountBadge count={subBadgeTotal} />}
              {chevron}
            </button>
          </CollapsibleTrigger>
        )}
        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <ul className="relative mt-0.5 mb-1 ml-[17px] flex flex-col gap-px border-l border-[#e2e2e5] pl-2">
            {item.items.map((subItem) => (
              <li key={subItem.url + subItem.title}>
                <Link
                  href={subItem.url}
                  onClick={closeMobile}
                  aria-current={subItem.isActive ? "page" : undefined}
                  className={cn(
                    navRowClass,
                    "h-[26px] gap-2 font-normal text-[#52525b] [&>svg]:size-3.5 [&>svg]:text-[#6b6b73]",
                    subItem.isActive && cn(navRowActiveClass, "font-medium")
                  )}
                >
                  {subItem.icon && <subItem.icon />}
                  <span className="truncate">{subItem.title}</span>
                  {subItem.hasWarning && <WarningIcon />}
                  {subItem.badge !== undefined && subItem.badge > 0 && <CountBadge count={subItem.badge} />}
                </Link>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </li>
    </Collapsible>
  )
}

export function NavMain({
  items,
  label = "Platform",
}: {
  items: NavItem[]
  label?: string
}) {
  return (
    <div className="flex flex-col">
      <div className="mt-2 mb-0.5 flex h-6 items-center px-2.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavMainItem key={item.title} item={item} storageKey={`${label}:${item.title}`} />
        ))}
      </ul>
    </div>
  )
}
