import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { generateEventConfirmationEmailHtml } from "@/lib/email-templates";
import { getUserFromCookies } from "@/lib/auth-server";
import {
  emailJobManager,
  type EmailTask,
  type EmailTaskResult,
} from "@/lib/email-job-manager";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const user = await getUserFromCookies();
    if (!user?.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId } = await params;
    const body = await request.json();
    const { formVersionId, onlyUnsent } = body;

    if (!formVersionId) {
      return NextResponse.json(
        { error: "Missing required field: formVersionId" },
        { status: 400 }
      );
    }

    const formVersion = await prisma.formVersion.findUnique({
      where: { id: Number(formVersionId) },
      include: { form: true },
    });

    if (!formVersion) {
      return NextResponse.json(
        { error: "Form version not found" },
        { status: 404 }
      );
    }

    const metadata = (formVersion.metadata || {}) as Record<string, any>;
    if (!metadata.is_event_registration) {
      return NextResponse.json(
        { error: "Form is not an event registration form" },
        { status: 400 }
      );
    }

    const form = formVersion.form;
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });
    const formName = form.name || "Event Registration";
    const emailSubject = `${formName} - Your Event Ticket`;
    const emailContent =
      "Please find your personal QR code ticket below. Present it at the entrance for a smooth check-in. We look forward to seeing you there!";

    const responses = await prisma.formResponse.findMany({
      where: {
        form_version_id: Number(formVersionId),
        archived: { not: true },
        attendant_uuid: { not: null },
      },
      select: { id: true, data: true, attendant_uuid: true },
    });

    const formDomain =
      process.env.NEXT_PUBLIC_FORM_DOMAIN ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const tasks: EmailTask[] = [];
    let preSkipped = 0;

    for (const response of responses) {
      const data = (response.data || {}) as Record<string, any>;

      if (onlyUnsent && data._qr_email_sent_at) {
        preSkipped++;
        continue;
      }

      const email = data._student_email || data.email;
      const firstname = data._student_first_name || data.firstname || "";
      const lastname = data._student_last_name || data.lastname || "";

      if (!email || !response.attendant_uuid) {
        preSkipped++;
        continue;
      }

      // Capture variables for the closure
      const responseId = response.id;
      const responseData = { ...data };
      const attendantUuid = response.attendant_uuid;

      tasks.push(async (): Promise<EmailTaskResult> => {
        const fullName = `${firstname} ${lastname}`.trim() || "Guest";

        let personalizedContent = emailContent
          .replace(/{firstname}/g, firstname || "Guest")
          .replace(/{lastname}/g, lastname || "");

        if (
          !personalizedContent.includes("<") ||
          !personalizedContent.includes(">")
        ) {
          personalizedContent = personalizedContent.replace(/\n/g, "<br>");
        }

        const attendantLink = `${formDomain}/attendant/${attendantUuid}`;

        const emailHtml = generateEventConfirmationEmailHtml({
          subject: emailSubject,
          fullName,
          personalizedContent,
          eventDate: metadata.event_date || undefined,
          eventEndDate: metadata.event_end_date || undefined,
          eventLocation: metadata.event_location || undefined,
          formName,
          attendantLink,
        });

        await sendEmail({
          to: email,
          subject: emailSubject,
          html: emailHtml,
        });

        // Fetch fresh data before updating to avoid overwriting concurrent changes
        const freshResponse = await prisma.formResponse.findUnique({
          where: { id: responseId },
          select: { data: true },
        });
        await prisma.formResponse.update({
          where: { id: responseId },
          data: {
            data: {
              ...((freshResponse?.data || responseData) as Record<string, unknown>),
              _qr_email_sent_at: new Date().toISOString(),
            } as Prisma.InputJsonValue,
          },
        });

        return "sent";
      });
    }

    if (tasks.length === 0) {
      return NextResponse.json({
        success: true,
        jobId: null,
        total: responses.length,
        toSend: 0,
        preSkipped,
        message: "No emails to send",
      });
    }

    const jobId = `qr-${formId}-${Date.now()}`;
    const scope = `qr-emails-${formId}`;

    try {
      emailJobManager.startJob(jobId, scope, tasks);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("already running")
      ) {
        return NextResponse.json(
          {
            error: "A QR email job is already running for this form",
            activeJobs: emailJobManager.getJobsForScope(scope),
          },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json({
      success: true,
      jobId,
      total: responses.length,
      toSend: tasks.length,
      preSkipped,
    });
  } catch (error) {
    console.error("Error in send-qr-emails route:", error);
    return NextResponse.json(
      {
        error: "Failed to send QR emails",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
