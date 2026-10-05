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
import { LayoutDashboard, LayoutGrid, MessageSquareWarning, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ADMIN_FEEDBACK_URL,
  ADMIN_NAV_GROUP_ICONS,
  ADMIN_NAV_GROUP_ORDER,
  ADMIN_NAV_ITEMS,
} from "./admin-nav";
import { useUser } from "@/providers/UserProvider";
import { fetchPendingApprovalRequestsAction, fetchCompanyByIdAction } from "@/app/actions/companies";
import { validateExistingPageImage } from "@/lib/utils/image-validation";
import { getFileUrl } from "@/components/Images";
import type { SidebarData } from "@/lib/sidebar-data";

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

export function AppSidebar({ data: sidebarData, ...props }: React.ComponentProps<typeof Sidebar> & { data: SidebarData }) {
  const { user } = useUser();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = React.useState<number>(sidebarData.pendingApprovals);
  const [pageImageInvalid, setPageImageInvalid] = React.useState<boolean>(false);
  const companyEvents = sidebarData.companyEvents;
  const companyOrderingBoothId = sidebarData.orderingBoothId;

  // Flag the company page image when it no longer meets the requirements. The
  // check loads the image, so it runs in the browser.
  const checkPageImage = React.useCallback(async (pageImageId: string | null) => {
    const pageImageUrl = pageImageId ? getFileUrl(pageImageId) : null;
    if (!pageImageUrl) {
      setPageImageInvalid(false);
      return;
    }
    try {
      const validation = await validateExistingPageImage(pageImageUrl);
      setPageImageInvalid(!validation.valid);
    } catch (error) {
      console.error("Error checking page image validity:", error);
      setPageImageInvalid(false);
    }
  }, []);

  React.useEffect(() => {
    checkPageImage(sidebarData.pageImageId);
  }, [checkPageImage, sidebarData.pageImageId]);

  // The settings pages announce company edits; re-check the image then.
  React.useEffect(() => {
    const companyId = user?.company?.id;
    const handleCompanyUpdate = async (event: CustomEvent) => {
      if (!companyId || event.detail?.companyId !== companyId) return;
      const company = await fetchCompanyByIdAction(companyId).catch(() => null);
      checkPageImage(company?.page_image ? String(company.page_image) : null);
    };

    window.addEventListener('company-updated', handleCompanyUpdate as unknown as EventListener);
    return () => {
      window.removeEventListener('company-updated', handleCompanyUpdate as unknown as EventListener);
    };
  }, [checkPageImage, user?.company?.id]);

  // Keep the admins' pending-approvals badge current. The layout supplies the
  // first count, so this only polls -- and not while the tab is hidden.
  React.useEffect(() => {
    if (!user?.admin) {
      return;
    }

    let alive = true;
    let consecutiveErrors = 0;
    let pollTimeout: NodeJS.Timeout | null = null;
    const MAX_CONSECUTIVE_ERRORS = 3;
    const POLLING_INTERVAL = 30000; // 30 seconds
    const ERROR_BACKOFF_MULTIPLIER = 2;

    const fetchCount = async () => {
      if (!alive) return;
      if (document.visibilityState === "hidden") {
        pollTimeout = setTimeout(fetchCount, POLLING_INTERVAL);
        return;
      }

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

    pollTimeout = setTimeout(fetchCount, POLLING_INTERVAL);

    return () => {
      alive = false;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, [user?.admin]);

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
          ...companyEvents.map((event) => ({
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
          {inAdminArea && user?.admin && (
            <a
              href={ADMIN_FEEDBACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={navRowClass}
            >
              <MessageSquareWarning />
              <span>Feedback / IT Support</span>
            </a>
          )}
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
