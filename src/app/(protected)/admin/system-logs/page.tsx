import Link from "next/link";
import { getUserFromCookies } from "@/lib/auth-server";
import {
  SYSTEM_LOG_RETENTION_DAYS,
  SYSTEM_LOG_SOURCES,
  listSystemLogs,
  type SystemLogLevel,
} from "@/lib/repos/system-logs";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";
import { filterHref, type Filters } from "./filters";
import { LogsTable } from "./logs-table";

export const dynamic = "force-dynamic";

const LEVELS: SystemLogLevel[] = ["error", "warn", "info"];

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

      <LogsTable logs={logs} filters={filters} />
    </div>
  );
}
