"use client";

import Link from "next/link";
import type { SystemLogEntry, SystemLogLevel } from "@/lib/repos/system-logs";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/DataTable";
import { filterHref, type Filters } from "./filters";

const LEVEL_VARIANT: Record<SystemLogLevel, "destructive" | "warning" | "muted"> = {
  error: "destructive",
  warn: "warning",
  info: "muted",
};

/** The loaded log entries; which entries are loaded is up to the page's filters. */
export function LogsTable({ logs, filters }: { logs: SystemLogEntry[]; filters: Filters }) {
  return (
    <DataTable
      rows={logs}
      columns={[
        {
          key: "createdAt",
          label: "Time",
          className: "font-mono text-xs",
          render: (log) => log.createdAt.toLocaleString("en-GB", { timeZone: "Europe/Brussels" }),
        },
        {
          key: "level",
          label: "Level",
          render: (log) => <Badge variant={LEVEL_VARIANT[log.level] ?? "muted"}>{log.level}</Badge>,
        },
        {
          key: "event",
          label: "Event",
          className: "font-mono text-xs",
          value: (log) => `${log.source}/${log.event}`,
          render: (log) => (
            <Link
              href={filterHref(filters, { source: log.source, event: log.event })}
              className="hover:underline"
            >
              {log.source}/{log.event}
            </Link>
          ),
        },
        {
          key: "message",
          label: "Message",
          wrap: true,
          className: "break-words",
          render: (log) => (
            <>
              {log.message}
              {log.details && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    details
                  </summary>
                  <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </details>
              )}
            </>
          ),
        },
        { key: "studentId", label: "Student", className: "font-mono text-xs" },
      ]}
      getRowId={(log) => String(log.id)}
      noun="log entry"
      nounPlural="log entries"
      search={{ placeholder: "Search these entries…" }}
      defaultSort={{ key: "createdAt", desc: true }}
      emptyMessage="No log entries match these filters"
    />
  );
}
