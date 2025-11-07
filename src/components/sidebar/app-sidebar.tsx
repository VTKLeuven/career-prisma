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
      url: "#",
      icon: IconBrandInstagram,
      items: [
        {
          title: "Social Media Post",
          url: "#",
        },
        {
          title: "Mailing",
          url: "#",
        },
      ],
    },
    {
      title: "Job Platform",
      url: "#",
      icon: IconFileCv,
      items: [
        {
          title: "CV Book",
          url: "#",
        },
        {
          title: "Vacancies",
          url: "#",
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
      url: "#",
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

  // Add admin sections if user is admin
  const navItems = React.useMemo(() => {
    const items = [...data.navMain];

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
        ],
      });
    }

    return items;
  }, [user?.admin]);

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
