import { NextRequest, NextResponse } from "next/server";
import {
  listActiveMatchingSoftwareIds,
  syncAllCompanyMatchedStudents,
} from "@/lib/repos/matching-software";
import { logSystemEvent } from "@/lib/repos/system-logs";

export const maxDuration = 300;

/** Daily cron at 0:00 UTC: sync company matches for all active matching software.
 * Secured by CRON_SECRET. Set in Vercel: Project → Settings → Environment Variables. */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const durationSeconds = () => Math.round((Date.now() - startedAt) / 1000);

  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
    console.log("[Cron sync-company-matches]", msg);
  };

  try {
    const ids = await listActiveMatchingSoftwareIds();
    log(`Found ${ids.length} active matching software`);
    if (ids.length === 0) {
      // One row per run, so the status page can tell "ran, had nothing to
      // do" from "has not run at all".
      await logSystemEvent({
        source: "cron",
        level: "info",
        event: "sync_company_matches",
        message: "Company matches sync ran: no active matching software",
        details: { matchingSoftware: 0, synced: 0, errors: 0, durationSeconds: durationSeconds() },
      });
      return NextResponse.json({ ok: true, synced: 0, logs });
    }

    let totalSynced = 0;
    const allErrors: string[] = [];
    for (const matchingSoftwareId of ids) {
      try {
        const { synced, errors } = await syncAllCompanyMatchedStudents(
          matchingSoftwareId,
          log
        );
        totalSynced += synced;
        allErrors.push(...errors);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`Error syncing ${matchingSoftwareId}: ${msg}`);
        allErrors.push(`${matchingSoftwareId}: ${msg}`);
      }
    }
    log(`Done: ${totalSynced} companies synced, ${allErrors.length} errors`);
    await logSystemEvent({
      source: "cron",
      level: allErrors.length > 0 ? "warn" : "info",
      event: "sync_company_matches",
      message: `Company matches sync ran: ${totalSynced} companies synced, ${allErrors.length} errors`,
      details: {
        matchingSoftware: ids.length,
        synced: totalSynced,
        errors: allErrors.length,
        ...(allErrors.length > 0 && { firstErrors: allErrors.slice(0, 20) }),
        durationSeconds: durationSeconds(),
      },
    });
    return NextResponse.json({
      ok: true,
      synced: totalSynced,
      errors: allErrors,
      logs,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Fatal: ${msg}`);
    await logSystemEvent({
      source: "cron",
      level: "error",
      event: "sync_company_matches",
      message: `Company matches sync failed: ${msg}`,
      details: { durationSeconds: durationSeconds() },
    });
    return NextResponse.json(
      { ok: false, error: msg, logs },
      { status: 500 }
    );
  }
}
