import Link from "next/link";
import { getUserFromCookies } from "@/lib/auth-server";
import {
  SYSTEM_LOG_RETENTION_DAYS,
  SYSTEM_LOG_SOURCES,
  listSystemLogs,
  type SystemLogLevel,
} from "@/lib/repos/system-logs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

const LEVELS: SystemLogLevel[] = ["error", "warn", "info"];

const LEVEL_STYLES: Record<SystemLogLevel, string> = {
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  info: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

type Filters = { source?: string; level?: SystemLogLevel; event?: string };

/** Builds a filter link that keeps the other active filters. */
function filterHref(current: Filters, change: Partial<Filters>): string {
  const next = { ...current, ...change };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/admin/system-logs?${query}` : "/admin/system-logs";
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-muted"
      )}
    >
      {children}
    </Link>
  );
}

export default async function SystemLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const params = await searchParams;
  const pick = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;

  const levelParam = pick("level");
  const filters: Filters = {
    source: pick("source"),
    level: LEVELS.includes(levelParam as SystemLogLevel)
      ? (levelParam as SystemLogLevel)
      : undefined,
    event: pick("event"),
  };

  const logs = await listSystemLogs({ ...filters, limit: 300 });

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        title="System Logs"
        description={
          <>
            Technical events from the website — VTK logins first. The newest 300
            matching entries are shown; entries are kept for{" "}
            {SYSTEM_LOG_RETENTION_DAYS} days.
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip href={filterHref(filters, { source: undefined })} active={!filters.source}>
          All sources
        </FilterChip>
        {SYSTEM_LOG_SOURCES.map((source) => (
          <FilterChip
            key={source}
            href={filterHref(filters, { source })}
            active={filters.source === source}
          >
            {source}
          </FilterChip>
        ))}
        <span className="mx-2 h-5 w-px bg-border" />
        <FilterChip href={filterHref(filters, { level: undefined })} active={!filters.level}>
          All levels
        </FilterChip>
        {LEVELS.map((level) => (
          <FilterChip
            key={level}
            href={filterHref(filters, { level })}
            active={filters.level === level}
          >
            {level}
          </FilterChip>
        ))}
        {filters.event && (
          <>
            <span className="mx-2 h-5 w-px bg-border" />
            <FilterChip href={filterHref(filters, { event: undefined })} active>
              event: {filters.event} ✕
            </FilterChip>
          </>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="p-6 text-muted-foreground">No log entries match these filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Time</TableHead>
                  <TableHead className="w-20">Level</TableHead>
                  <TableHead className="w-48">Event</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-24">Student</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="align-top">
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {log.createdAt.toLocaleString("en-GB", {
                        timeZone: "Europe/Brussels",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge className={LEVEL_STYLES[log.level] ?? LEVEL_STYLES.info}>
                        {log.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={filterHref(filters, { source: log.source, event: log.event })}
                        className="hover:underline"
                      >
                        {log.source}/{log.event}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
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
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.studentId ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
