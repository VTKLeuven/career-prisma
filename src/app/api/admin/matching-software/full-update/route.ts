import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { syncAllCompanyMatchedStudents } from "@/lib/repos/matching-software";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromCookies();
    if (!user?.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const urlId = request.nextUrl.searchParams.get("matchingSoftwareId");
    const raw = body?.matchingSoftwareId ?? body?.matching_software_id ?? urlId;
    const matchingSoftwareId = raw != null ? String(raw) : "";
    if (!matchingSoftwareId) {
      return NextResponse.json(
        { error: "Missing matchingSoftwareId" },
        { status: 400 }
      );
    }

    const logs: string[] = [];
    const log = (msg: string) => {
      logs.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
      console.log("[Matching]", msg);
    };
    const { synced, errors } = await syncAllCompanyMatchedStudents(matchingSoftwareId, log);
    const result = {
      studentsUpdated: 0,
      companiesSynced: synced,
      errors,
      logs,
    };
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[full-update] Error:", msg);
    return NextResponse.json(
      {
        studentsUpdated: 0,
        companiesSynced: 0,
        errors: [`Update failed: ${msg}`],
        logs: [`[Error] ${msg}`],
      },
      { status: 500 }
    );
  }
}
