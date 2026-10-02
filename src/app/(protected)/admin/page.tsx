"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Search, UserRoundCheck } from "lucide-react";
import { useUser } from "@/providers/UserProvider";
import { fetchPendingApprovalRequestsAction } from "@/app/actions/companies";
import {
  ADMIN_NAV_ITEMS,
  ADMIN_NAV_GROUP_ORDER,
  ADMIN_NAV_GROUP_ICONS,
  type AdminNavItem,
} from "@/components/sidebar/admin-nav";
import { openCommandPalette, isMacPlatform } from "@/components/sidebar/command-palette";

function greeting(hour: number) {
  if (hour < 6) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function AdminHubPage() {
  const { user } = useUser();
  const [pendingCount, setPendingCount] = React.useState<number>(0);
  // Rendered on the client only, so the greeting follows the viewer's clock.
  const [now, setNow] = React.useState<Date | null>(null);
  const [isMac, setIsMac] = React.useState(true);

  React.useEffect(() => {
    setNow(new Date());
    setIsMac(isMacPlatform());
  }, []);

  React.useEffect(() => {
    if (!user?.admin) return;
    let alive = true;
    fetchPendingApprovalRequestsAction()
      .then((requests) => {
        if (alive) setPendingCount(requests.length);
      })
      .catch(() => {
        /* non-critical badge */
      });
    return () => {
      alive = false;
    };
  }, [user?.admin]);

  if (!user?.admin) return <p>NO ACCESS</p>;

  const badgeFor = (item: AdminNavItem) =>
    item.url === "/admin/approvals" && pendingCount > 0 ? pendingCount : undefined;

  const firstName = (user.name ?? "").split(" ")[0];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground tabular">
            {now
              ? now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
              : " "}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.015em]">
            {now ? greeting(now.getHours()) : "Welcome"}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex h-9 w-full items-center gap-2 rounded-[10px] border border-input bg-background px-3 text-left text-sm text-[#8b8b93] shadow-xs transition-colors hover:border-[#d4d4d8] sm:w-72"
        >
          <Search className="size-4 text-[#6b6b73]" />
          <span className="flex-1">Jump to a page…</span>
          <kbd className="rounded-md border bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
      </div>

      {pendingCount > 0 && (
        <Link
          href="/admin/approvals"
          className="group flex items-center gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 transition-colors hover:bg-[#fef3c7]"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#fde68a] bg-background text-[#b45309]">
            <UserRoundCheck className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#92400e]">
              {pendingCount} representative {pendingCount === 1 ? "request is" : "requests are"} waiting for approval
            </p>
            <p className="text-xs text-[#b45309]">Review them so the companies can get started.</p>
          </div>
          <span className="flex items-center gap-1 text-sm font-medium text-[#b45309]">
            Review <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ADMIN_NAV_GROUP_ORDER.map((group) => {
          const items = ADMIN_NAV_ITEMS.filter((i) => i.group === group);
          if (items.length === 0) return null;
          const GroupIcon = ADMIN_NAV_GROUP_ICONS[group];
          return (
            <section key={group} className="flex flex-col overflow-hidden rounded-xl border bg-background">
              <header className="flex h-11 items-center gap-2 border-b bg-[#fafafa] px-4">
                <GroupIcon className="size-4 text-[#6b6b73]" />
                <h2 className="text-[13px] font-medium text-foreground">{group}</h2>
                <span className="ml-auto text-xs text-muted-foreground tabular">{items.length}</span>
              </header>
              <ul className="flex flex-col p-1.5">
                {items.map((item) => {
                  const badge = badgeFor(item);
                  return (
                    <li key={item.url}>
                      <Link
                        href={item.url}
                        className="group flex items-center gap-3 rounded-[10px] px-2.5 py-2 transition-colors hover:bg-surface-hover"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-[#3f3f46] transition-colors group-hover:border-[#bee1ff] group-hover:text-[#0a6cba]">
                          <item.icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{item.title}</span>
                            {badge !== undefined && (
                              <span className="rounded-full bg-[#ebebfe] px-1.5 text-[11px] leading-4 font-semibold text-[#4840ac] tabular">
                                {badge}
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-[#d4d4d8] transition-colors group-hover:text-[#8b8b93]" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
