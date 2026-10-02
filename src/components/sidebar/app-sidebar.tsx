"use client";

import * as React from "react";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { navRowActiveClass, navRowClass } from "./nav-main";
import {
  CommandPalette,
  isMacPlatform,
  openCommandPalette,
  type PaletteItem,
} from "./command-palette";
import { cn } from "@/lib/utils";
import {
  IconBrandInstagram,
  IconCalendarEvent,
  IconFileCv,
  IconSettings,
  IconColumns,
  IconGlassCocktail,
} from "@tabler/icons-react";
import { LayoutDashboard, LayoutGrid, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ADMIN_NAV_GROUP_ICONS,
  ADMIN_NAV_GROUP_ORDER,
  ADMIN_NAV_ITEMS,
} from "./admin-nav";
import { useUser } from "@/providers/UserProvider";
import { fetchPendingApprovalRequestsAction, fetchCompanyByIdAction } from "@/app/actions/companies";
import { getCompanyOrderingTabInfo } from "@/app/actions/ordering";
import { validateExistingPageImage } from "@/lib/utils/image-validation";
import { getFileUrl } from "@/components/Images";
import { fetchEventsAction } from "@/app/actions/events";
import type { CareerEvent, Company } from "@/lib/schema";
import { hasCompanyPageAccess } from "@/lib/utils/company-access";

// Updated sidebar data
const data = {
  navMain: [
    {
      title: "Events",
      url: "/dashboard",
      icon: IconCalendarEvent,
      isActive: false,
      items: [
        {
          title: "My Scans",
          url: "/dashboard/scans",
        },
      ],
    },
    {
      title: "Online Interaction",
      url: "/dashboard/online-interaction",
      icon: IconBrandInstagram,
      items: [
        {
          title: "Social Media Post",
          url: "/dashboard/online-interaction/social-media-post",
        },
        {
          title: "Mailing",
          url: "/dashboard/online-interaction/mailing",
        },
      ],
    },
    {
      title: "Job Platform",
      url: "/dashboard/job-platform",
      icon: IconFileCv,
      items: [
        {
          title: "CV Book",
          url: "/dashboard/job-platform/cv-book",
        },
        {
          title: "Vacancies",
          url: "/dashboard/job-platform/vacancies",
        },
      ],
    },
    // {
    //   title: "Purchases",
    //   url: "#",
    //   icon: IconShoppingBag,
    // },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
      items: [
        {
          title: "Company Information",
          url: "/dashboard/settings/information",
        },
        {
          title: "Users",
          url: "/dashboard/settings/users",
        },
        {
          title: "Billing",
          url: "/dashboard/settings/billing",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = React.useState<number>(0);
  const [pageImageInvalid, setPageImageInvalid] = React.useState<boolean>(false);
  const [companyEvents, setCompanyEvents] = React.useState<CareerEvent[]>([]);
  const [company, setCompany] = React.useState<Company | null>(null);
  const [companyOrderingBoothId, setCompanyOrderingBoothId] = React.useState<string | null>(null);

  // Function to check page image validity
  const checkPageImage = React.useCallback(async () => {
    if (!user?.company?.id) {
      setPageImageInvalid(false);
      return;
    }

    try {
      const company = await fetchCompanyByIdAction(user.company.id);
      if (!company) {
        setPageImageInvalid(false);
        return;
      }

      const pageImageUrl = company.page_image ? getFileUrl(company.page_image) : null;
      if (pageImageUrl) {
        const validation = await validateExistingPageImage(pageImageUrl);
        setPageImageInvalid(!validation.valid);
      } else {
        setPageImageInvalid(false);
      }
    } catch (error) {
      console.error("Error checking page image validity:", error);
      setPageImageInvalid(false);
    }
  }, [user?.company?.id]);

  // Check if company page image is invalid
  React.useEffect(() => {
    checkPageImage();
  }, [checkPageImage]);

  // Listen for company update events
  React.useEffect(() => {
    const handleCompanyUpdate = (event: CustomEvent) => {
      // Re-check page image validity when company is updated
      if (event.detail?.companyId === user?.company?.id) {
        checkPageImage();
      }
    };

    window.addEventListener('company-updated', handleCompanyUpdate as EventListener);

    return () => {
      window.removeEventListener('company-updated', handleCompanyUpdate as EventListener);
    };
  }, [checkPageImage, user?.company?.id]);

  // Fetch pending approvals count for admins/salespeople only
  // Company reps should not see this, so we check both admin and salesperson status
  React.useEffect(() => {
    // Only fetch for admins - salespeople will be checked in the action itself
    // This prevents unnecessary API calls for company reps
    if (!user?.admin) {
      return;
    }

    let alive = true;
    let consecutiveErrors = 0;
    let pollTimeout: NodeJS.Timeout | null = null;
    const MAX_CONSECUTIVE_ERRORS = 3;
    const POLLING_INTERVAL = 10000; // 10 seconds
    const ERROR_BACKOFF_MULTIPLIER = 2;

    const fetchCount = async () => {
      if (!alive) return;

      try {
        const requests = await fetchPendingApprovalRequestsAction();
        if (!alive) return;

        setPendingCount(requests.length);
        consecutiveErrors = 0;

        // Schedule next fetch with normal polling interval
        if (alive) {
          pollTimeout = setTimeout(fetchCount, POLLING_INTERVAL);
        }
      } catch (error) {
        if (!alive) return;

        consecutiveErrors++;
        console.error(`Failed to fetch pending approvals count (attempt ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error);

        // Stop polling after too many consecutive errors
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.error(`Sidebar: Stopped polling after ${MAX_CONSECUTIVE_ERRORS} consecutive errors.`);
          return; // Don't schedule another fetch
        }

        // Exponential backoff: wait longer between retries after errors
        const backoffDelay = POLLING_INTERVAL * ERROR_BACKOFF_MULTIPLIER * consecutiveErrors;
        if (alive) {
          pollTimeout = setTimeout(fetchCount, backoffDelay);
        }
      }
    };

    fetchCount();

    return () => {
      alive = false;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, [user?.admin]);

  // Load company events for sidebar
  React.useEffect(() => {
    const companyId = user?.company?.id;
    if (!companyId) {
      setCompanyEvents([]);
      setCompanyOrderingBoothId(null);
      return;
    }

    let alive = true;

    (async () => {
      try {
        const [{ enabled, boothId }, companyData, allEvents, scans] = await Promise.all([
          getCompanyOrderingTabInfo(companyId).catch((error) => {
            console.error("Sidebar: failed to load ordering tab info:", error);
            return { enabled: false, boothId: null as string | null };
          }),
          fetchCompanyByIdAction(companyId),
          fetchEventsAction(),
          fetch("/api/scans").then((res) => (res.ok ? res.json() : [])).catch(() => []),
        ]);

        if (!alive) return;

        if (enabled && boothId) setCompanyOrderingBoothId(boothId);
        else setCompanyOrderingBoothId(null);

        setCompany(companyData as Company | null);

        // Extract company events from purchased options (same logic as dashboard page)
        const companyOptions = (companyData as Company)?.options ?? [];
        const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
        const hasEvents = (v: unknown): v is { events: unknown } => isRecord(v) && 'events' in v;
        const hasEvent = (v: unknown): v is { event: unknown } => isRecord(v) && 'event' in v;

        const companyEventIds = new Set<string>();

        companyOptions.forEach((opt: unknown) => {
          if (!opt || !isRecord(opt)) return;

          let optionWithEvents: Record<string, unknown> | null = null;

          if ('career_event_option_id' in opt && opt.career_event_option_id) {
            const ceo = opt.career_event_option_id;
            if (isRecord(ceo)) {
              optionWithEvents = ceo;
            }
          } else if (hasEvents(opt)) {
            optionWithEvents = opt;
          } else if (hasEvent(opt)) {
            const eventRef = (opt as { event: unknown }).event;
            if (isRecord(eventRef) && 'id' in eventRef) {
              const eventId = (eventRef as { id: string }).id;
              if (eventId) companyEventIds.add(eventId);
            }
            return;
          }

          if (!optionWithEvents) return;

          if (hasEvents(optionWithEvents) && Array.isArray(optionWithEvents.events)) {
            optionWithEvents.events.forEach((eventOrJunction: unknown) => {
              if (isRecord(eventOrJunction)) {
                if ('id' in eventOrJunction) {
                  companyEventIds.add((eventOrJunction as { id: string }).id);
                } else {
                  // Check junction table fields
                  const possibleFields = ['career_event_id', 'career_event', 'event_id', 'event'];
                  for (const field of possibleFields) {
                    if (field in eventOrJunction) {
                      const ref = (eventOrJunction as Record<string, unknown>)[field];
                      if (isRecord(ref) && 'id' in ref) {
                        companyEventIds.add((ref as { id: string }).id);
                        break;
                      }
                    }
                  }
                }
              }
            });
          }
        });

        // Also add events from scans (so events show up even if company hasn't purchased options)
        if (Array.isArray(scans)) {
          scans.forEach((scan: any) => {
            const metadata = scan.form_response_id?.form_version_id?.metadata;
            if (metadata && typeof metadata === 'object' && 'event_id' in metadata && metadata.event_id) {
              companyEventIds.add(metadata.event_id as string);
            }
          });
        }

        const filteredEvents = (allEvents ?? []).filter((e: CareerEvent) => companyEventIds.has(e.id));
        setCompanyEvents(filteredEvents);
      } catch (error) {
        // Catch-all to avoid unhandled promise rejections on every page render.
        console.error("Sidebar: failed to load company sidebar data:", error);
        if (!alive) return;
        setCompany(null);
        setCompanyEvents([]);
        setCompanyOrderingBoothId(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user?.company?.id]);

  // Whether the user is currently browsing the admin area (/admin/*).
  const inAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  // Build the sidebar navigation. Admin management and the company dashboard are
  // kept separate: inside /admin/* we show only the admin navigation, everywhere
  // else we show only the company dashboard sections.
  const navItems = React.useMemo(() => {
    // --- Admin area: show only admin navigation ---
    if (inAdminArea && user?.admin) {
      const adminGroups = ADMIN_NAV_GROUP_ORDER.map((group) => ({
        title: group,
        url: "#",
        icon: ADMIN_NAV_GROUP_ICONS[group],
        isActive: ADMIN_NAV_ITEMS.some(
          (item) => item.group === group && pathname.startsWith(item.url)
        ),
        items: ADMIN_NAV_ITEMS
          .filter((item) => item.group === group)
          .sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }))
          .map((item) => ({
            title: item.title,
            url: item.url,
            icon: item.icon,
            isActive: pathname.startsWith(item.url),
            ...(item.url === "/admin/approvals" && pendingCount > 0 ? { badge: pendingCount } : {}),
          })),
      }));

      return adminGroups;
    }

    // --- Company dashboard context ---
    let items: any[] = [];

    // Only show Company Dashboard (navMain) to Admins or Company Representatives
    if (user?.admin || user?.company) {
      items = [...data.navMain];
    }

    // Update Events section with dynamic event scan links
    const eventsIndex = items.findIndex(item => item.title === "Events");
    if (eventsIndex !== -1 && companyEvents.length > 0) {
      items[eventsIndex] = {
        ...items[eventsIndex],
        items: [
          {
            title: "All Scans",
            url: "/dashboard/scans/all",
          },
          ...companyEvents.map((event: CareerEvent) => ({
            title: event.name,
            url: `/dashboard/scans/event/${encodeURIComponent(event.name)}`,
          })),
        ],
      };
    } else if (eventsIndex !== -1) {
      // Keep "My Scans" if no events yet
      items[eventsIndex] = {
        ...items[eventsIndex],
        items: [
          {
            title: "All Scans",
            url: "/dashboard/scans/all",
          },
        ],
      };
    }

    // Add warning to Settings and Company Information if page image is invalid
    const settingsIndex = items.findIndex(item => item.title === "Settings");
    if (settingsIndex !== -1) {
      // Add warning to Settings parent item
      items[settingsIndex] = {
        ...items[settingsIndex],
        hasWarning: pageImageInvalid,
      };

      // Add warning to Company Information sub-item
      if (items[settingsIndex].items) {
        const companyInfoIndex = items[settingsIndex].items.findIndex(
          (item: any) => item.title === "Company Information"
        );
        if (companyInfoIndex !== -1) {
          items[settingsIndex].items[companyInfoIndex] = {
            ...items[settingsIndex].items[companyInfoIndex],
            hasWarning: pageImageInvalid,
          };
        }
      }
    }

    // Add Ordering section
    const orderingItems: { title: string; url: string }[] = [];
    if (user?.is_shifter || user?.admin) {
      orderingItems.push({ title: "Shifter Dashboard", url: "/dashboard/shifter" });
    }
    // Company reps: Order Drinks at their booth (when admin setting is enabled)
    if (user?.company && companyOrderingBoothId) {
      orderingItems.push({ title: "Order Drinks", url: `/dashboard/order-drinks` });
    }

    if (orderingItems.length > 0) {
      items.push({
        title: "Ordering",
        url: "#",
        icon: IconGlassCocktail,
        items: orderingItems,
      });
    }

    // Sort the top-level sections alphabetically by title.
    items.sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }));

    return items;
  }, [inAdminArea, pathname, user?.admin, user?.company, user?.is_shifter, pendingCount, pageImageInvalid, companyEvents, companyOrderingBoothId]);

  // Every section the viewer can navigate to, for the ⌘K palette.
  const paletteItems = React.useMemo<PaletteItem[]>(() => {
    const result: PaletteItem[] = [];
    if (user?.admin) {
      result.push({ title: "Admin overview", url: "/admin", group: "Admin", icon: LayoutGrid });
      for (const group of ADMIN_NAV_GROUP_ORDER) {
        for (const item of ADMIN_NAV_ITEMS.filter((i) => i.group === group)) {
          result.push({ title: item.title, url: item.url, group, description: item.description, icon: item.icon });
        }
      }
    }
    if (user?.admin || user?.company) {
      for (const section of data.navMain) {
        for (const sub of section.items ?? []) {
          result.push({ title: sub.title, url: sub.url, group: `Company dashboard · ${section.title}`, icon: section.icon });
        }
      }
    }
    return result;
  }, [user?.admin, user?.company]);

  const isMac = React.useSyncExternalStore(
    () => () => {},
    isMacPlatform,
    () => true
  );

  return (
    <>
      <Sidebar variant="inset" collapsible="offcanvas" {...props}>
        <SidebarHeader className="gap-3 px-3 pt-3 pb-1">
          <Link
            href={inAdminArea ? "/admin" : "/"}
            className="flex h-10 items-center gap-2.5 rounded-[10px] px-1.5 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/career_blue.png" alt="" className="h-6 w-auto" />
            <span className="text-[19px] font-semibold tracking-[-0.015em] text-foreground">Career</span>
            {inAdminArea && (
              <span className="ml-auto rounded-md border border-[#d9d8fe] bg-[#f6f6ff] px-1.5 py-px text-[11px] font-semibold text-[#5b4fd9]">
                Admin
              </span>
            )}
          </Link>
          {paletteItems.length > 0 && (
            <button
              type="button"
              onClick={openCommandPalette}
              className="flex h-8 w-full items-center gap-2 rounded-[10px] border border-input bg-background px-2.5 text-left text-[13px] text-[#8b8b93] shadow-xs outline-none transition-colors hover:border-[#d4d4d8] focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <Search className="size-4 text-[#6b6b73]" />
              <span className="flex-1">Search…</span>
              <kbd className="flex items-center gap-0.5 rounded-md border bg-muted px-1 text-[11px] font-semibold text-muted-foreground">
                {isMac ? "⌘" : "Ctrl"} K
              </kbd>
            </button>
          )}
        </SidebarHeader>
        <SidebarContent className="scrollbar-thin gap-0 px-3 pb-3">
          {inAdminArea && user?.admin && (
            <ul className="mt-2 flex flex-col gap-0.5">
              <li>
                <Link
                  href="/admin"
                  aria-current={pathname === "/admin" ? "page" : undefined}
                  className={cn(navRowClass, pathname === "/admin" && navRowActiveClass)}
                >
                  <LayoutGrid />
                  <span>Overview</span>
                  {pendingCount > 0 && (
                    <span className="ml-auto rounded-full bg-[#ebebfe] px-1.5 text-[11px] leading-4 font-semibold text-[#4840ac] tabular">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </li>
            </ul>
          )}
          <NavMain items={navItems} label={inAdminArea ? "Administration" : "Platform"} />
        </SidebarContent>
        <SidebarFooter className="gap-1 border-t border-sidebar-border px-3 pt-2 pb-3">
          {user?.admin && (
            <Link
              href={inAdminArea ? "/dashboard" : "/admin"}
              className={navRowClass}
            >
              {inAdminArea ? <LayoutDashboard /> : <IconColumns />}
              <span>{inAdminArea ? "Company Dashboard" : "Admin Panel"}</span>
            </Link>
          )}
          <NavUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      {paletteItems.length > 0 && <CommandPalette items={paletteItems} />}
    </>
  );
}
