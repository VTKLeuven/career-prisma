// lib/repos/system-logs.ts — the technical log the IT admins read at
// /admin/system-logs.
//
// `server-only`, not "use server": a "use server" module turns its exports into
// server actions, and nothing outside the server may write to or read this log.
import "server-only";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export type SystemLogLevel = "info" | "warn" | "error";

/** Known sources, for the filter on the logs page. Add one when you log from a new subsystem. */
export const SYSTEM_LOG_SOURCES = ["vtk_sso"] as const;

/**
 * How long a log line lives. Long enough to look back over an event week,
 * short enough that the table never needs thinking about.
 */
export const SYSTEM_LOG_RETENTION_DAYS = 90;

export interface SystemLogInput {
  source: string;
  level: SystemLogLevel;
  event: string;
  message: string;
  studentId?: number | string | null;
  /** Never tokens, secrets or r-numbers. */
  details?: Record<string, unknown>;
}

export interface SystemLogEntry {
  id: string;
  createdAt: Date;
  source: string;
  level: SystemLogLevel;
  event: string;
  message: string;
  studentId: number | null;
  details: Record<string, unknown> | null;
}

const PRUNE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let lastPrunedAt = 0;

/**
 * Records a technical event, and mirrors it to the console so `docker logs`
 * still shows everything.
 *
 * Never throws. Logging sits on the login path, and a full disk or a
 * connection hiccup must not turn into a failed login.
 */
export async function logSystemEvent(entry: SystemLogInput): Promise<void> {
  const line = `[${entry.source}] ${entry.event}: ${entry.message}`;
  if (entry.level === "error") console.error(line, entry.details ?? "");
  else if (entry.level === "warn") console.warn(line, entry.details ?? "");
  else console.info(line);

  const studentId = entry.studentId == null ? null : Number(entry.studentId);

  try {
    await prisma.systemLog.create({
      data: {
        source: entry.source,
        level: entry.level,
        event: entry.event,
        message: entry.message,
        student_id: Number.isSafeInteger(studentId) ? studentId : null,
        details: (entry.details ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    await pruneIfDue();
  } catch (error) {
    console.error("[logSystemEvent] Could not write log entry:", error);
  }
}

/**
 * Retention without a cron job: whichever write comes first after the
 * interval deletes the expired rows. At most once an hour per process.
 */
async function pruneIfDue(): Promise<void> {
  if (Date.now() - lastPrunedAt < PRUNE_INTERVAL_MS) return;
  lastPrunedAt = Date.now();
  const cutoff = new Date(Date.now() - SYSTEM_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.systemLog.deleteMany({ where: { created_at: { lt: cutoff } } });
}

function shapeLog(row: {
  id: string;
  created_at: Date;
  source: string;
  level: string;
  event: string;
  message: string;
  student_id: number | null;
  details: Prisma.JsonValue;
}): SystemLogEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    source: row.source,
    level: row.level as SystemLogLevel,
    event: row.event,
    message: row.message,
    studentId: row.student_id,
    details:
      row.details && typeof row.details === "object" && !Array.isArray(row.details)
        ? (row.details as Record<string, unknown>)
        : null,
  };
}

export async function listSystemLogs(filter: {
  source?: string;
  level?: SystemLogLevel;
  event?: string;
  limit?: number;
}): Promise<SystemLogEntry[]> {
  const rows = await prisma.systemLog.findMany({
    where: {
      source: filter.source || undefined,
      level: filter.level || undefined,
      event: filter.event || undefined,
    },
    orderBy: { created_at: "desc" },
    take: Math.min(filter.limit ?? 200, 1000),
  });
  return rows.map(shapeLog);
}

/** Counts per level and the newest entry per event, for the status page. */
export async function summarizeSystemLogs(
  source: string,
  since: Date
): Promise<{
  counts: Record<SystemLogLevel, number>;
  lastByEvent: Record<string, Date>;
}> {
  const [byLevel, byEvent] = await Promise.all([
    prisma.systemLog.groupBy({
      by: ["level"],
      where: { source, created_at: { gte: since } },
      _count: { _all: true },
    }),
    prisma.systemLog.groupBy({
      by: ["event"],
      where: { source },
      _max: { created_at: true },
    }),
  ]);

  const counts: Record<SystemLogLevel, number> = { info: 0, warn: 0, error: 0 };
  for (const row of byLevel) {
    if (row.level in counts) counts[row.level as SystemLogLevel] = row._count._all;
  }

  const lastByEvent: Record<string, Date> = {};
  for (const row of byEvent) {
    if (row._max.created_at) lastByEvent[row.event] = row._max.created_at;
  }

  return { counts, lastByEvent };
}

/** The newest applied Prisma migration, so the status page can show what schema is live. */
export async function latestAppliedMigration(): Promise<{
  name: string;
  finishedAt: Date | null;
} | null> {
  const rows = await prisma.$queryRaw<
    { migration_name: string; finished_at: Date | null }[]
  >`SELECT migration_name, finished_at FROM _prisma_migrations
    WHERE rolled_back_at IS NULL ORDER BY finished_at DESC NULLS LAST LIMIT 1`;
  return rows[0]
    ? { name: rows[0].migration_name, finishedAt: rows[0].finished_at }
    : null;
}
