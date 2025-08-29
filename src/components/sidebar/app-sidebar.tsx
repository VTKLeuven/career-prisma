"use client"

import * as React from "react"

import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar"
import { IconBrandInstagram, IconCalendarEvent, IconFileCv, IconSettings, IconShoppingBag } from "@tabler/icons-react"
import Link from "next/link"

// This is sample data.
const data = {
  navMain: [
    {
      title: "Events",
      url: "#",
      icon: IconCalendarEvent,
      isActive: true,
      items: [
        {
          title: "My Events",
          url: "#",
        },
        {
          title: "Upcoming Events",
          url: "#",
        },
      ],
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
        {
          title: "CV Book",
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
          title: "Social Media Post",
          url: "#",
        },
        {
          title: "Mailing",
          url: "#",
        },
        {
          title: "CV Book",
          url: "#",
        },
      ],
    },
    {
      title: "Purchases",
      url: "#",
      icon: IconShoppingBag,
    },
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
      items: [
        {
          title: "Company Information",
          url: "#",
        },
        {
          title: "Users",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const {open} = useSidebar()
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>

            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground data-[state=close]:text-center"
            >
              <Link href={"/"}>{open && <span className="font-extrabold text-xl">VTK CAREER</span>}</Link>
            </SidebarMenuButton></SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>

  )
}
