"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { ADMIN_NAV_ITEMS } from "@/components/sidebar/admin-nav";
import { cn } from "@/lib/utils";

/**
 * Title row shared by the admin pages: an icon tile, the title, one line of
 * description and the page's actions on the right (secondary buttons first,
 * the one primary action last). The icon defaults to the section's icon from
 * ADMIN_NAV_ITEMS, so the header, sidebar and breadcrumb always agree.
 */
export function PageHeader({
  title,
  description,
  actions,
  icon,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: ComponentType<{ className?: string }> | null;
  className?: string;
  /** Extra content under the title row, e.g. tabs or stat chips. */
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const section = ADMIN_NAV_ITEMS.filter(
    (i) => pathname === i.url || pathname.startsWith(`${i.url}/`)
  ).sort((a, b) => b.url.length - a.url.length)[0];
  const Icon = icon === null ? null : icon ?? section?.icon;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          {Icon && (
            <span className="hidden shrink-0 rounded-[16px] bg-[#f0f8ff] p-1.5 sm:block">
              <span className="flex size-10 items-center justify-center rounded-xl border bg-background text-[#0a6cba] shadow-[0_1px_2px_rgb(16_16_20/0.04)]">
                <Icon className="size-5" />
              </span>
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-[-0.012em] text-foreground sm:text-2xl sm:tracking-[-0.015em]">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">{actions}</div>
        )}
      </div>
      {children}
    </div>
  );
}

/** Small pill with a number, for counts next to a title or in a toolbar. */
export function CountPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full bg-[#f0f0f2] px-2 text-xs font-medium text-muted-foreground tabular",
        className
      )}
    >
      {children}
    </span>
  );
}
