import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { emailJobManager } from "@/lib/email-job-manager";
import { getSmtpQueueStats } from "@/lib/email";

export async function GET() {
  const user = await getUserFromCookies();
  if (!user?.admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const smtpStats = await getSmtpQueueStats();
  const stats = emailJobManager.getStats(smtpStats);
  return NextResponse.json(stats);
}

export async function POST(request: NextRequest) {
  const user = await getUserFromCookies();
  if (!user?.admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, jobId } = body;

  if (action === "cancel" && jobId) {
    const cancelled = emailJobManager.cancelJob(jobId);
    if (!cancelled) {
      return NextResponse.json(
        { error: "Job not found or not cancellable" },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
