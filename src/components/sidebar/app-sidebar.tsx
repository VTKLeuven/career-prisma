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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  IconBrandInstagram,
  IconCalendarEvent,
  IconFileCv,
  IconSettings,
  IconColumns,
} from "@tabler/icons-react";
import Link from "next/link";
import { useUser } from "@/providers/UserProvider";
import { fetchPendingApprovalRequestsAction } from "@/app/actions/companies";

// Updated sidebar data
const data = {
  navMain: [
    {
      title: "Events",
      url: "/dashboard",
      icon: IconCalendarEvent,
      isActive: true,
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
  const { open } = useSidebar();
  const { user } = useUser();
  const [pendingCount, setPendingCount] = React.useState<number>(0);

  // Fetch pending approvals count for admins/salespeople
  React.useEffect(() => {
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

  // Add admin sections if user is admin
  const navItems = React.useMemo(() => {
    const items: any[] = [...data.navMain];

    // Add Forms section for admins
    if (user?.admin) {
      items.push({
        title: "Admin",
        url: "#",
        icon: IconColumns,
        items: [
          {
            title: "Forms Management",
            url: "/admin/forms",
          },
          {
            title: "Companies & Events",
            url: "/admin",
          },
          {
            title: "Pending Approvals",
            url: "/admin/approvals",
            ...(pendingCount > 0 && { badge: pendingCount }),
          },
        ],
      });
    }

    return items;
  }, [user?.admin, pendingCount]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground data-[state=close]:text-center"
            >
              <Link href={"/"}>
                {open && <span className="font-extrabold text-xl">VTK CAREER</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
