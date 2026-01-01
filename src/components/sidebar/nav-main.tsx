"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

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
import { TablerIcon } from "@tabler/icons-react"
import { IconAlertTriangle } from "@tabler/icons-react"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: TablerIcon
    isActive?: boolean
    badge?: number
    hasWarning?: boolean
    items?: {
      title: string
      url: string
      badge?: number
      hasWarning?: boolean
    }[]
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          // Events section should be collapsed by default
          const defaultOpen = item.title === "Events" ? false : (item.isActive || item.hasWarning);
          const [isOpen, setIsOpen] = useState(defaultOpen);
          const hasWarningInSubItems = item.items?.some(subItem => subItem.hasWarning) ?? false;
          
          return (
            <Collapsible
              key={item.title}
              asChild
              open={isOpen}
              onOpenChange={setIsOpen}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                {item.items !== undefined ? (
                  <>
                    <div className="flex items-center gap-1">
                      <SidebarMenuButton tooltip={item.title} asChild className="flex-1">
                        <Link href={item.url}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          {hasWarningInSubItems && !isOpen && (
                            <IconAlertTriangle className="h-4 w-4 text-red-600 shrink-0" style={{ color: '#dc2626' }} title="Page background image has invalid dimensions" />
                          )}
                          {item.badge !== undefined && item.badge > 0 && (
                            <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-sidebar-accent transition-colors"
                          aria-label={isOpen ? "Collapse" : "Expand"}
                        >
                          <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild>
                              <Link href={subItem.url} className="flex items-center gap-2">
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
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
