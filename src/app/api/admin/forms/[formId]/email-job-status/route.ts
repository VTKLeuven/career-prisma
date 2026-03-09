import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { emailJobManager } from "@/lib/email-job-manager";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const user = await getUserFromCookies();
  if (!user?.admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formId } = await params;
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (jobId) {
    const job = emailJobManager.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ job });
  }

  // Return all jobs for this form (both QR and reminder scopes)
  const qrJobs = emailJobManager.getJobsForScope(`qr-emails-${formId}`);
  const reminderJobs = emailJobManager.getJobsForScope(`reminders-${formId}`);
  return NextResponse.json({ jobs: [...qrJobs, ...reminderJobs] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const user = await getUserFromCookies();
  if (!user?.admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await params;
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
    return NextResponse.json({ success: true, message: "Job cancellation requested" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
