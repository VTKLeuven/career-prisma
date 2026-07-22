"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import type { ComponentType } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { IconAlertTriangle } from "@tabler/icons-react"

type NavIcon = ComponentType<{ className?: string }>

type NavItem = {
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
  }[]
}

function NavMainItem({ item }: { item: NavItem }) {
  // Events section should be collapsed by default
  const defaultOpen = item.title === "Events" ? false : (item.isActive || item.hasWarning);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasWarningInSubItems = item.items?.some(subItem => subItem.hasWarning) ?? false;

  // Events: label navigates to dashboard, only arrow toggles collapsible
  const isEventsItem = item.title === "Events";

  return (
    <Collapsible
      asChild
      open={isOpen}
      onOpenChange={setIsOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        {item.items !== undefined ? (
          <>
            {isEventsItem ? (
              <SidebarMenuButton
                tooltip={item.title}
                className="flex-1 p-0"
                asChild
              >
                <div className="flex w-full items-center">
                  <Link
                    href={item.url}
                    className="flex flex-1 items-center gap-2 rounded-l-md px-2 py-1.5 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0 min-h-8"
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    {hasWarningInSubItems && !isOpen && (
                      <IconAlertTriangle className="h-4 w-4 text-red-600 shrink-0" style={{ color: '#dc2626' }} title="Page background image has invalid dimensions" />
                    )}
                    {item.badge !== undefined && item.badge > 0 && (
                      <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                    )}
                  </Link>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-r-md border-l border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      aria-label={isOpen ? "Collapse Events" : "Expand Events"}
                    >
                      <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </button>
                  </CollapsibleTrigger>
                </div>
              </SidebarMenuButton>
            ) : (
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title} className="flex-1">
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  {hasWarningInSubItems && !isOpen && (
                    <IconAlertTriangle className="h-4 w-4 text-red-600 shrink-0" style={{ color: '#dc2626' }} title="Page background image has invalid dimensions" />
                  )}
                  {item.badge !== undefined && item.badge > 0 && (
                    <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                  )}
                  <ChevronRight className="h-4 w-4 ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
            )}
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items?.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton asChild>
                      <Link href={subItem.url} className="flex items-center gap-2">
                        {subItem.icon && <subItem.icon className="h-4 w-4 shrink-0" />}
                        <span>{subItem.title}</span>
                        {subItem.hasWarning && isOpen && (
                          <IconAlertTriangle className="h-4 w-4 text-red-600 shrink-0" style={{ color: '#dc2626' }} title="Page background image has invalid dimensions" />
                        )}
                        {subItem.badge !== undefined && subItem.badge > 0 && (
                          <SidebarMenuBadge>{subItem.badge}</SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </>
        ) : (
          <SidebarMenuButton asChild tooltip={item.title}>
            <Link href={item.url}>
              {item.icon && <item.icon />}
              <span>{item.title}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
              )}
            </Link>
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function NavMain({
  items,
}: {
  items: NavItem[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <NavMainItem key={item.title} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
