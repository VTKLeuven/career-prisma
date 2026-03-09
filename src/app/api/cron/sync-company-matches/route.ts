import { NextRequest, NextResponse } from "next/server";
import {
  listActiveMatchingSoftwareIds,
  syncAllCompanyMatchedStudents,
} from "@/lib/repos/matching-software";

export const maxDuration = 300;

/** Daily cron at 0:00 UTC: sync company matches for all active matching software.
 * Secured by CRON_SECRET. Set in Vercel: Project → Settings → Environment Variables. */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
    console.log("[Cron sync-company-matches]", msg);
  };

  try {
    const ids = await listActiveMatchingSoftwareIds();
    log(`Found ${ids.length} active matching software`);
    if (ids.length === 0) {
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
    return NextResponse.json({
      ok: true,
      synced: totalSynced,
      errors: allErrors,
      logs,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Fatal: ${msg}`);
    return NextResponse.json(
      { ok: false, error: msg, logs },
      { status: 500 }
    );
  }
}
