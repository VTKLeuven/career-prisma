"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LayoutGrid, PanelLeft, Search } from "lucide-react";
import type { ComponentType } from "react";

import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ADMIN_NAV_ITEMS } from "./admin-nav";
import { openCommandPalette } from "./command-palette";

type Crumb = { label: string; href?: string; icon?: ComponentType<{ className?: string }> };

/** "company-completion" -> "Company completion". */
function humanize(segment: string): string {
  const s = decodeURIComponent(segment).replace(/[-_]+/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Ids in deep links (form ids, event ids) read as noise in a breadcrumb.
const looksLikeId = (s: string) => /^[0-9a-f-]{16,}$/i.test(s) || /^\d+$/.test(s);

/**
 * Breadcrumb derived from the URL, so no page has to declare one: the admin
 * section comes from ADMIN_NAV_ITEMS (its icon and title), deeper segments are
 * humanised.
 */
function crumbsFor(pathname: string): Crumb[] {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const crumbs: Crumb[] = [{ label: "Admin", href: "/admin", icon: LayoutGrid }];
    const section = ADMIN_NAV_ITEMS.filter(
      (i) => pathname === i.url || pathname.startsWith(`${i.url}/`)
    ).sort((a, b) => b.url.length - a.url.length)[0];
    if (!section) {
      const rest = pathname.split("/").filter(Boolean).slice(1);
      rest.forEach((seg) => !looksLikeId(seg) && crumbs.push({ label: humanize(seg) }));
      return crumbs;
    }
    crumbs.push({ label: section.title, href: section.url, icon: section.icon });
    const rest = pathname.slice(section.url.length).split("/").filter(Boolean);
    rest.forEach((seg) => !looksLikeId(seg) && crumbs.push({ label: humanize(seg) }));
    return crumbs;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "dashboard") {
    const crumbs: Crumb[] = [{ label: "Dashboard", href: "/dashboard" }];
    let href = "/dashboard";
    for (const seg of segments.slice(1)) {
      href += `/${seg}`;
      if (looksLikeId(seg) || seg === "event") continue;
      crumbs.push({ label: humanize(seg), href });
    }
    return crumbs;
  }
  return segments.map((seg) => ({ label: humanize(seg) }));
}

export function ShellHeader({
  children,
  isAdmin = false,
}: {
  children?: React.ReactNode;
  /** Shows a shortcut to the admin outside the admin area. */
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const crumbs = crumbsFor(pathname);
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 md:px-5">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-1 size-8 text-muted-foreground md:size-7"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <PanelLeft />
      </Button>
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          const Icon = c.icon;
          const inner = (
            <span className="inline-flex min-w-0 items-center gap-2">
              {Icon && <Icon className="size-4 shrink-0 text-[#6b6b73]" />}
              <span className="truncate">{c.label}</span>
            </span>
          );
          return (
            <span
              key={`${c.label}-${i}`}
              className={`flex min-w-0 items-center gap-1.5 ${last ? "" : "hidden sm:flex"}`}
            >
              {i > 0 && <ChevronRight className="hidden size-4 shrink-0 text-[#a1a1aa] sm:block" aria-hidden />}
              {c.href && !last ? (
                <Link
                  href={c.href}
                  className="min-w-0 rounded-md text-[15px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {inner}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={`min-w-0 text-[15px] ${last ? "font-medium text-foreground" : "text-muted-foreground"}`}
                >
                  {inner}
                </span>
              )}
            </span>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        {isAdmin && !inAdmin && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">
              <LayoutGrid />
              Admin
            </Link>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground md:hidden"
          onClick={openCommandPalette}
          aria-label="Search pages"
        >
          <Search />
        </Button>
      </div>
    </header>
  );
}
