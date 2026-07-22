"use client";

import * as React from "react";
import Link from "next/link";
import { useUser } from "@/providers/UserProvider";
import { fetchPendingApprovalRequestsAction } from "@/app/actions/companies";
import {
  ADMIN_NAV_ITEMS,
  ADMIN_NAV_GROUP_ORDER,
  type AdminNavItem,
} from "@/components/sidebar/admin-nav";

export default function AdminHubPage() {
  const { user } = useUser();
  const [pendingCount, setPendingCount] = React.useState<number>(0);

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

  return (
    <div className="flex flex-col gap-8 py-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          VTK Career management. Everything here is only visible to administrators.
        </p>
      </div>

      {ADMIN_NAV_GROUP_ORDER.map((group) => {
        const items = ADMIN_NAV_ITEMS.filter((i) => i.group === group);
        if (items.length === 0) return null;
        return (
          <section key={group} className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const badge = badgeFor(item);
                return (
                  <Link
                    key={item.url}
                    href={item.url}
                    className="group relative flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium leading-tight">{item.title}</span>
                        {badge !== undefined && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                            {badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
