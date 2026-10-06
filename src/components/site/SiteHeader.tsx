"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { ChevronDown, LogOut, User, UserCog, Bell, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetchPublicEventsAction } from "@/app/actions/events"
import type { CareerEvent } from "@/lib/schema"
import { fetchSessionCheck } from "@/lib/session-client"
import { eventZoneToday } from "@/lib/utils/events"

/**
 * The public site header.
 *
 * There used to be five hand-copied versions of this (the layout, the
 * homepage, the company page, and two inside the event page). They drifted:
 * the Admin button existed in only one, the company page's Events buttons
 * opened nothing at all, and a campaign link added to one was invisible on the
 * rest. Everything shared now lives here; the parts that legitimately differ
 * are props.
 *
 * What is deliberately NOT customisable, because divergence there is exactly
 * what caused the drift: the account cluster (Admin / Company Dashboard /
 * Student login / Contact / the student menu), how it is authorised, and the
 * shell around it.
 */

/**
 * Campaign override for the Events nav item. While one edition is the whole
 * story, the header points straight at it instead of opening the dropdown.
 *
 * `null` = the normal Events dropdown. To feature an edition (January, for
 * Jobfair 2027) set it to the label and its public URL:
 *
 *   const FEATURED_EVENT_LINK: FeaturedEventLink =
 *     { label: "Jobfair 2027", href: "/event/vtk-jobfair" };
 *
 * Setting it back to `null` restores the dropdown. One edit, every page.
 */
type FeaturedEventLink = { label: string; href: string } | null
const FEATURED_EVENT_LINK: FeaturedEventLink = null

export type SiteHeaderNavItem = {
  key: string
  label: string
  /** Shorter label for the cramped mobile strip. Defaults to `label`. */
  mobileLabel?: string
  href?: string
  /** For in-page anchors and anything else that is not a navigation. */
  onSelect?: () => void
  /** Escape hatch for an item that is its own control, e.g. a file download. */
  render?: (ctx: { isMobile: boolean; className: string }) => React.ReactNode
}

export type SiteHeaderProps = {
  /**
   * Replaces the standard nav (Our students / Vacancies). The event page uses
   * this for its Floorplan / Matching / CV Upload buttons. Home is always
   * rendered first. Implies `showEventsMenu={false}` unless set explicitly.
   */
  navItems?: SiteHeaderNavItem[]
  /** Appended to the standard nav. Ignored when `navItems` is given. */
  extraNavItems?: SiteHeaderNavItem[]
  /** The Events dropdown and its mobile list. Defaults to true, or false when `navItems` is given. */
  showEventsMenu?: boolean
  /** Dark treatment, for pages with a dark hero (speaker pages). */
  dark?: boolean
}

type CompanyRep = { authenticated: boolean; name: string; is_shifter?: boolean; admin?: boolean }
type Student = { authenticated: boolean; firstName: string | null; lastName: string | null; is_shifter?: boolean }

const DEFAULT_NAV: SiteHeaderNavItem[] = [
  { key: "our-students", label: "Our students", href: "/our-students" },
  { key: "vacancies", label: "Vacancies", href: "/vacancies" },
]

export function SiteHeader({
  navItems,
  extraNavItems,
  showEventsMenu,
  dark = false,
}: SiteHeaderProps) {
  const eventsMenuEnabled = showEventsMenu ?? navItems === undefined
  const items = navItems ?? [...DEFAULT_NAV, ...(extraNavItems ?? [])]

  const [openMenu, setOpenMenu] = React.useState<null | "events">(null)
  const [menuOpenedViaClick, setMenuOpenedViaClick] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [companyRep, setCompanyRep] = React.useState<CompanyRep | null>(null)
  const [student, setStudent] = React.useState<Student | null>(null)
  const [events, setEvents] = React.useState<CareerEvent[]>([])
  const router = useRouter()
  const pathname = usePathname()
  const menuRef = React.useRef<HTMLElement>(null)
  const mobileMenuRef = React.useRef<HTMLDivElement>(null)
  const eventsMenuRef = React.useRef<HTMLDivElement>(null)

  // Upcoming events for the dropdown. Only fetched when something shows them.
  React.useEffect(() => {
    if (!eventsMenuEnabled) return
    const ac = new AbortController()

    const load = async () => {
      try {
        // The API route is cached; the action is the fallback.
        const res = await fetch("/api/homepage", { signal: ac.signal })
        const data = (await res.json()) as { events?: CareerEvent[] }
        if (!ac.signal.aborted) setEvents(data.events ?? [])
      } catch {
        if (ac.signal.aborted) return
        try {
          // Public-only: a draft edition has no page to link to.
          const rows = await fetchPublicEventsAction()
          if (!ac.signal.aborted) setEvents(rows ?? [])
        } catch {
          // Ignore: non-critical header data.
        }
      }
    }

    load()
    return () => ac.abort()
  }, [eventsMenuEnabled])

  const checkAuthStatus = React.useCallback(() => {
    fetchSessionCheck()
      .then((data) => {
        // Only an explicit `authenticated: true` counts.
        setCompanyRep(data?.companyRep?.authenticated === true ? data.companyRep : null)
        setStudent(data?.student?.authenticated === true ? data.student : null)
      })
      .catch(() => {
        setCompanyRep(null)
        setStudent(null)
      })
  }, [])

  React.useEffect(() => {
    checkAuthStatus()
  }, [pathname, checkAuthStatus])

  React.useEffect(() => {
    // The user may have signed in on another tab.
    window.addEventListener("focus", checkAuthStatus)
    return () => window.removeEventListener("focus", checkAuthStatus)
  }, [checkAuthStatus])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !target.closest("button[aria-expanded]")
      ) {
        setMobileMenuOpen(false)
      }
      if (
        eventsMenuRef.current &&
        !eventsMenuRef.current.contains(event.target as Node) &&
        !target.closest('button[aria-controls="mega-events"]')
      ) {
        setOpenMenu(null)
        setMenuOpenedViaClick(false)
      }
    }

    if (mobileMenuOpen || openMenu === "events") {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [mobileMenuOpen, openMenu])

  // On a phone the link strip scrolls; bring the current page's link into view.
  const mobileNavRef = React.useRef<HTMLElement>(null)
  React.useEffect(() => {
    const nav = mobileNavRef.current
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return
    const offset = current.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft
    nav.scrollLeft = offset - (nav.clientWidth - current.offsetWidth) / 2
  }, [pathname])

  /** Whether a link points at the page being viewed (Home only on the homepage). */
  const isCurrent = (href: string | undefined) =>
    !!href && (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`))

  /** A nav link; the current page's is the filled pill (it used to be Home, always). */
  const linkClass = (isMobile: boolean, current = false) =>
    [
      isMobile ? "whitespace-nowrap shrink-0 rounded-full px-3 py-1.5 text-xs font-medium" : "rounded-full px-4 py-2 text-sm font-medium",
      current
        ? dark ? "bg-[#262626] text-white hover:bg-[#333] border-0" : "bg-vtk-blue text-white"
        : dark ? "text-neutral-200 hover:bg-neutral-700/50" : "text-neutral-800 hover:bg-neutral-100",
    ].join(" ")

  const renderNavItem = (item: SiteHeaderNavItem, isMobile: boolean) => {
    const current = isCurrent(item.href)
    const className = linkClass(isMobile, current)
    if (item.render) {
      return <React.Fragment key={item.key}>{item.render({ isMobile, className })}</React.Fragment>
    }
    const label = isMobile ? item.mobileLabel ?? item.label : item.label
    if (item.href) {
      return (
        <Link
          key={item.key}
          href={item.href}
          className={className}
          aria-current={current ? "page" : undefined}
          onClick={() => setMobileMenuOpen(false)}
        >
          {label}
        </Link>
      )
    }
    return (
      <button
        key={item.key}
        type="button"
        className={className}
        onClick={() => {
          setMobileMenuOpen(false)
          item.onSelect?.()
        }}
      >
        {label}
      </button>
    )
  }

  /** Jumps to the homepage's full events list, from any page. */
  const viewAllEvents = () => {
    setOpenMenu(null)
    setMobileMenuOpen(false)
    if (window.location.pathname === "/") {
      window.dispatchEvent(new CustomEvent("viewAllEvents"))
      window.location.hash = "#all-events"
    } else {
      window.location.href = "/#all-events"
    }
  }

  const today = eventZoneToday()
  const upcoming = events
    // Drafts are already gone: this list comes from the public events
    // endpoint / action. Today and future events only, by the date in Belgium
    // (as the homepage decides it).
    .filter((e) => typeof e.date === "string" && e.date.slice(0, 10) >= today)
    .sort((a, b) => {
      try {
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      } catch {
        return 0
      }
    })

  return (
    <header
      ref={menuRef}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpenMenu(null)
          setMenuOpenedViaClick(false)
          setMobileMenuOpen(false)
        }
      }}
      className={`fixed inset-x-0 z-50 w-full px-2 sm:px-0 ${dark ? "top-0 pt-2 sm:pt-4" : "top-2 sm:top-4"}`}
      aria-label="Site navigation"
    >
      <div className="mx-auto max-w-7xl px-2 sm:px-4">
        <div
          className={`flex items-center justify-between gap-2 sm:gap-3 rounded-xl sm:rounded-2xl px-2 sm:px-3 md:px-5 py-1.5 sm:py-2 md:py-3 backdrop-blur-md ${
            dark
              ? "bg-vtk-blue-dark border-0 shadow-none ring-0"
              : "bg-white/85 shadow-[0_12px_40px_rgba(0,0,0,0.10)] ring-1 ring-black/5"
          }`}
        >
          <Link href="/" className="flex shrink-0 items-center gap-1 sm:gap-2 rounded-full px-1 sm:px-2">
            <Image
              src="/career_blue.png"
              alt="VTK Career"
              width={120}
              height={40}
              className={`h-6 sm:h-8 w-auto self-center ${dark ? "brightness-0 invert" : ""}`}
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 md:flex">
            <Link href="/" className={linkClass(false, isCurrent("/"))} aria-current={isCurrent("/") ? "page" : undefined}>
              Home
            </Link>

            {eventsMenuEnabled ? (
              FEATURED_EVENT_LINK ? (
                <Link href={FEATURED_EVENT_LINK.href} className={linkClass(false, isCurrent(FEATURED_EVENT_LINK.href))}>
                  {FEATURED_EVENT_LINK.label}
                </Link>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onMouseEnter={() => {
                      if (!menuOpenedViaClick) setOpenMenu("events")
                    }}
                    onFocus={() => setOpenMenu("events")}
                    onClick={() => {
                      setOpenMenu("events")
                      setMenuOpenedViaClick(true)
                    }}
                    className={`inline-flex items-center gap-1 ${linkClass(false, pathname.startsWith("/event"))}`}
                    aria-expanded={openMenu === "events"}
                    aria-controls="mega-events"
                  >
                    Events <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              )
            ) : null}

            {items.map((item) => renderNavItem(item, false))}
          </nav>

          {/* Mobile nav: scrolls sideways when the links don't fit (an event page
              can carry five), so the menu button stays on screen. */}
          <nav ref={mobileNavRef} className="md:hidden flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 scrollbar-hide">
            <Link href="/" className={linkClass(true, isCurrent("/"))} aria-current={isCurrent("/") ? "page" : undefined}>
              Home
            </Link>

            {eventsMenuEnabled ? (
              FEATURED_EVENT_LINK ? (
                <Link href={FEATURED_EVENT_LINK.href} className={linkClass(true, isCurrent(FEATURED_EVENT_LINK.href))}>
                  {FEATURED_EVENT_LINK.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className={linkClass(true, pathname.startsWith("/event"))}
                  aria-expanded={mobileMenuOpen}
                >
                  Events
                </button>
              )
            ) : null}

            {items.map((item) => renderNavItem(item, true))}
          </nav>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <AccountButtons companyRep={companyRep} student={student} router={router} />

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden inline-flex items-center justify-center rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-vtk-blue ${
                dark
                  ? "text-neutral-200 hover:bg-neutral-700/50"
                  : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel. Fades in with CSS (tw-animate-css): framer-motion
          here put a 36 KB chunk on every public page for two menu fades. */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 md:hidden animate-in fade-in-0 slide-in-from-top-2 duration-200"
        >
          <div className="mx-auto max-w-7xl px-2 sm:px-4">
            <div
              className={`rounded-xl sm:rounded-2xl border backdrop-blur-md shadow-xl p-4 ${
                dark ? "bg-neutral-800/95 border-neutral-600/50" : "bg-white/95"
              }`}
            >
              {eventsMenuEnabled && (
                <div className="mb-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className={`text-sm font-semibold ${dark ? "text-neutral-100" : "text-neutral-900"}`}>
                      Upcoming events
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 rounded-full text-xs px-3 ${
                        dark
                          ? "border-white/60 text-white hover:bg-white/20"
                          : "border-vtk-blue text-vtk-blue hover:bg-vtk-blue/5"
                      }`}
                      onClick={viewAllEvents}
                    >
                      View all
                    </Button>
                  </div>
                  <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {upcoming.slice(0, 6).map((event) => (
                      <li key={event.name}>
                        <Link
                          href={event.href ?? "#"}
                          className={`block rounded-lg border p-3 transition ${
                            dark
                              ? "bg-neutral-700/50 border-neutral-600/50 hover:bg-neutral-600/50"
                              : "bg-neutral-50 hover:bg-vtk-light/40"
                          }`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <div className={`text-sm font-medium ${dark ? "text-neutral-100" : "text-neutral-900"}`}>
                            {event.name}
                          </div>
                          <div className={`mt-1 text-xs ${dark ? "text-neutral-400" : "text-neutral-600"}`}>
                            {event.date} · {event.location}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div
                className={`space-y-2 ${eventsMenuEnabled ? "border-t pt-4" : ""} ${
                  dark ? "border-neutral-600/50" : ""
                }`}
              >
                <MobileAccountButtons
                  companyRep={companyRep}
                  student={student}
                  router={router}
                  dark={dark}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop events mega menu */}
      {eventsMenuEnabled && openMenu === "events" && (
        <div
          ref={eventsMenuRef}
          id="mega-events"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 hidden md:block animate-in fade-in-0 slide-in-from-top-2 duration-200"
          onMouseEnter={() => setOpenMenu("events")}
          onMouseLeave={() => {
            if (!menuOpenedViaClick) setOpenMenu(null)
          }}
        >
          <div className="mx-auto max-w-7xl px-4">
            <div
              className={`rounded-2xl border backdrop-blur-md shadow-xl -mx-8 ${
                dark ? "bg-neutral-800/90 border-neutral-600/50" : "bg-white/85"
              }`}
            >
              <div className="grid grid-cols-1 gap-8 px-4 py-8 md:grid-cols-3">
                <div className="md:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className={`text-sm font-medium ${dark ? "text-neutral-100" : "text-neutral-900"}`}>
                      Upcoming events
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`rounded-full ${
                        dark
                          ? "border-white/60 text-white hover:bg-white/20"
                          : "border-vtk-blue text-vtk-blue hover:bg-vtk-blue/5"
                      }`}
                      onClick={viewAllEvents}
                    >
                      View all
                    </Button>
                  </div>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {upcoming.slice(0, 8).map((event) => (
                      <li
                        key={event.name}
                        className={`rounded-xl border p-3 ${
                          dark ? "border-neutral-600/50 hover:bg-neutral-700/50" : "hover:bg-vtk-light/40"
                        }`}
                      >
                        <Link href={event.href ?? "#"} className="block">
                          <div className={`text-sm font-medium ${dark ? "text-neutral-100" : "text-neutral-900"}`}>
                            {event.name}
                          </div>
                          <div className={`mt-0.5 text-xs ${dark ? "text-neutral-400" : "text-neutral-600"}`}>
                            {event.date} · {event.location}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="hidden md:block">
                  <div
                    className={`h-full rounded-2xl border p-5 ${
                      dark ? "bg-neutral-700/50 border-neutral-600/50" : "bg-vtk-light"
                    }`}
                  >
                    <div className={`text-sm font-medium ${dark ? "text-neutral-100" : "text-neutral-900"}`}>
                      Featured
                    </div>
                    <p className={`mt-1 text-sm ${dark ? "text-neutral-300" : "text-neutral-700"}`}>
                      Meet 200+ companies at our flagship jobfair in Leuven.
                    </p>
                    <div className="mt-4">
                      <Button
                        asChild
                        className={`rounded-full ${
                          dark
                            ? "bg-white/20 text-white hover:bg-white/30 border border-white/40"
                            : "bg-vtk-blue hover:bg-vtk-blueDark"
                        }`}
                      >
                        <Link href="/event/vtk-jobfair">Explore jobfair</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

type AccountProps = {
  companyRep: CompanyRep | null
  student: Student | null
  router: ReturnType<typeof useRouter>
}

const studentLogout = async (router: ReturnType<typeof useRouter>) => {
  await fetch("/api/students/logout", { method: "POST" })
  router.refresh()
  window.location.href = "/"
}

/**
 * The desktop account cluster. Every public page shows exactly this, which is
 * the point: the Admin button appears whenever a staff account is signed in,
 * beside the Company Dashboard button, on every page or none.
 */
function AccountButtons({ companyRep, student, router }: AccountProps) {
  return (
    <>
      {companyRep?.admin && (
        <Button asChild className="hidden rounded-full bg-vtk-blue hover:bg-vtk-blueDark md:inline-flex text-white">
          <Link href="/admin">Admin</Link>
        </Button>
      )}
      {!student && (
        <Button
          asChild
          variant="outline"
          className="hidden rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 md:inline-flex"
        >
          <Link href={companyRep ? "/dashboard" : "/login"}>Company Dashboard</Link>
        </Button>
      )}
      {!student && !companyRep && (
        <Button asChild className="hidden rounded-full bg-vtk-blue hover:bg-vtk-blueDark md:inline-flex text-white">
          <Link href="/student-login">Student login</Link>
        </Button>
      )}
      {!student && companyRep && (
        <Button asChild className="hidden rounded-full bg-vtk-blue hover:bg-vtk-blueDark md:inline-flex text-white">
          <Link href="/contact">Contact Us</Link>
        </Button>
      )}
      {student && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="hidden rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 md:inline-flex"
              >
                <User className="h-4 w-4 mr-2" />
                {student.firstName} {student.lastName}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {student.is_shifter && (
                <DropdownMenuItem onClick={() => router.push("/dashboard/shifter")}>
                  <Bell className="mr-2 h-4 w-4 text-orange-500" />
                  Shifter Dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href="/student/account">
                  <UserCog className="mr-2 h-4 w-4" />
                  My account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/student/liked-companies">
                  <Star className="mr-2 h-4 w-4 fill-amber-300 text-amber-400" />
                  Liked companies
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => studentLogout(router)}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild className="hidden rounded-full bg-vtk-blue hover:bg-vtk-blueDark md:inline-flex text-white">
            <Link href="/contact">Contact Us</Link>
          </Button>
        </>
      )}
    </>
  )
}

/** The same cluster, stacked, for the mobile menu panel. */
function MobileAccountButtons({
  companyRep,
  student,
  router,
  dark,
  onNavigate,
}: AccountProps & { dark: boolean; onNavigate: () => void }) {
  return (
    <>
      <Button
        asChild
        variant="outline"
        className={`rounded-full w-full ${
          dark
            ? "border-neutral-600 text-neutral-200 hover:bg-neutral-700/50"
            : "border-neutral-300 text-neutral-800 hover:bg-neutral-100"
        }`}
        onClick={onNavigate}
      >
        <Link href="/our-students">Our students</Link>
      </Button>
      {companyRep?.admin && (
        <Button
          asChild
          className="rounded-full bg-vtk-blue hover:bg-vtk-blueDark w-full text-white"
          onClick={onNavigate}
        >
          <Link href="/admin">Admin</Link>
        </Button>
      )}
      {!student && (
        <Button
          asChild
          variant="outline"
          className="rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 w-full"
          onClick={onNavigate}
        >
          <Link href={companyRep ? "/dashboard" : "/login"}>Company Dashboard</Link>
        </Button>
      )}
      {!student && !companyRep && (
        <Button
          asChild
          className="rounded-full bg-vtk-blue hover:bg-vtk-blueDark w-full text-white"
          onClick={onNavigate}
        >
          <Link href="/student-login">Student login</Link>
        </Button>
      )}
      {!student && companyRep && (
        <Button
          asChild
          className="rounded-full bg-vtk-blue hover:bg-vtk-blueDark w-full text-white"
          onClick={onNavigate}
        >
          <Link href="/contact">Contact Us</Link>
        </Button>
      )}
      {student && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="rounded-full border-vtk-yellow text-vtk-blue hover:bg-vtk-yellow/10 w-full"
              >
                <User className="h-4 w-4 mr-2" />
                {student.firstName} {student.lastName}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {student.is_shifter && (
                <DropdownMenuItem
                  onClick={() => {
                    onNavigate()
                    router.push("/dashboard/shifter")
                  }}
                >
                  <Bell className="mr-2 h-4 w-4 text-orange-500" />
                  Shifter Dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href="/student/account" onClick={onNavigate}>
                  <UserCog className="mr-2 h-4 w-4" />
                  My account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/student/liked-companies" onClick={onNavigate}>
                  <Star className="mr-2 h-4 w-4 fill-amber-300 text-amber-400" />
                  Liked companies
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => studentLogout(router)}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            asChild
            className="rounded-full bg-vtk-blue hover:bg-vtk-blueDark w-full text-white"
            onClick={onNavigate}
          >
            <Link href="/contact">Contact Us</Link>
          </Button>
        </>
      )}
    </>
  )
}
