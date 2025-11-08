'use client'

import { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface SectionItem {
  title: string
  url: string
}

interface SectionLayoutProps {
  title: string
  description?: string
  items: SectionItem[]
  children: ReactNode
}

export function SectionLayout({ title, description, items, children }: SectionLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b">
        <nav className="flex space-x-1" aria-label="Tabs">
          {items.map((item) => {
            const isActive = pathname === item.url || pathname?.startsWith(item.url + '/')
            return (
              <Link
                key={item.url}
                href={item.url}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-vtk-blue text-vtk-blue"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                )}
              >
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="mt-4">
        {children}
      </div>
    </div>
  )
}

