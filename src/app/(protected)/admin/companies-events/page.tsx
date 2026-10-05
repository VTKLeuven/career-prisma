import Link from "next/link";
import { IconBuilding, IconCalendarEvent } from "@tabler/icons-react";

/**
 * Backwards-compatible landing for old bookmarks: companies and events used to
 * share this page and are separate workflows now. (The admin layout already
 * turns away non-admins.)
 */
export default function LegacyCompaniesEventsPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">Companies & Events have moved</h1>
        <p className="mt-2 text-muted-foreground">
          These are separate workflows now. Choose what you want to manage.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/companies" className="rounded-xl border bg-card p-6 transition-colors hover:bg-accent">
          <IconBuilding className="mb-4 h-8 w-8" />
          <h2 className="text-xl font-semibold">Companies</h2>
          <p className="mt-2 text-sm text-muted-foreground">Company details, representatives, approvals and purchased options.</p>
        </Link>
        <Link href="/admin/events" className="rounded-xl border bg-card p-6 transition-colors hover:bg-accent">
          <IconCalendarEvent className="mb-4 h-8 w-8" />
          <h2 className="text-xl font-semibold">Events</h2>
          <p className="mt-2 text-sm text-muted-foreground">Recurring event series, annual editions and their public pages.</p>
        </Link>
      </div>
    </div>
  );
}
