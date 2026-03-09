import { NextRequest, NextResponse } from "next/server";
import { getServerDirectusClient } from "@/lib/directus";
import { readItems, readItem } from "@directus/sdk";
import { sendEmail } from "@/lib/repos/directus";
import { getUserFromCookies } from "@/lib/auth-server";
import {
  emailJobManager,
  type EmailTask,
  type EmailTaskResult,
} from "@/lib/email-job-manager";

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
    const { formVersionId, recipients, subject, content } = body;

    if (!formVersionId || !recipients || !Array.isArray(recipients)) {
      return NextResponse.json(
        { error: "Missing required fields: formVersionId, recipients" },
        { status: 400 }
      );
    }

    if (!subject || !content) {
      return NextResponse.json(
        { error: "Missing required fields: subject, content" },
        { status: 400 }
      );
    }

    const client = await getServerDirectusClient();
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const formVersion = (await client.request(
      readItem("form_versions" as any, formVersionId, {
        fields: ["*", { form_id: ["id", "name", "slug"] }, "metadata"],
      })
    )) as any;

    if (!formVersion) {
      return NextResponse.json(
        { error: "Form version not found" },
        { status: 404 }
      );
    }

    const form = formVersion.form_id;
    const metadata = formVersion.metadata || {};
    const eventId = metadata.event_id;

    if (!eventId) {
      return NextResponse.json(
        { error: "Form is not linked to an event" },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_FORM_DOMAIN ||
      "http://localhost:3000";
    const formUrl = `${baseUrl}/forms/company/${eventId}/${form.slug}`;

    const companyIds = [
      ...new Set(recipients.map((r: any) => r.companyId)),
    ];
    const companies = (await client.request(
      readItems("company" as any, {
        fields: ["id", "name"],
        filter: { id: { _in: companyIds } },
        limit: -1,
      })
    )) as any[];

    const companyMap = new Map(
      companies.map((c: any) => [c.id, c.name])
    );

    const repIds = recipients.map((r: any) => r.repId);
    const representatives = (await client.request(
      readItems("directus_users" as any, {
        fields: ["id", "first_name", "last_name", "email"] as any,
        filter: { id: { _in: repIds } },
        limit: -1,
      })
    )) as any[];

    const repMap = new Map(
      representatives.map((r: any) => [r.id, r])
    );

    const tasks: EmailTask[] = [];
    let preSkipped = 0;

    for (const recipient of recipients) {
      const rep = repMap.get(recipient.repId);
      const companyName =
        companyMap.get(recipient.companyId) || "Unknown Company";

      if (!rep || !rep.email) {
        preSkipped++;
        continue;
      }

      // Capture for closure
      const repEmail = rep.email;
      const repName =
        [rep.first_name, rep.last_name].filter(Boolean).join(" ") || "there";

      tasks.push(async (): Promise<EmailTaskResult> => {
        let emailSubject = subject
          .replace(/{name}/g, repName)
          .replace(/{company}/g, companyName)
          .replace(/{form_name}/g, form.name);

        const formLinkHtml = `<a href="${formUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 500;">Complete Form</a><br><br><p style="word-break: break-all; color: #2563eb;">${formUrl}</p>`;

        let emailContent = content
          .replace(/{name}/g, repName)
          .replace(/{company}/g, companyName)
          .replace(/{form_name}/g, form.name)
          .replace(/{form_link}/g, formLinkHtml);

        if (!emailContent.includes("<") || !emailContent.includes(">")) {
          emailContent = emailContent.replace(/\n/g, "<br>");
        }

        if (
          !emailContent.includes("<p>") &&
          !emailContent.includes("<div>")
        ) {
          emailContent = `<p>${emailContent.replace(/<br>/g, "</p><p>")}</p>`;
        }

        emailContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0;
                  padding: 0;
                  background-color: #f5f5f5;
                }
                .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  padding: 40px 20px;
                  background-color: #ffffff;
                }
              </style>
            </head>
            <body>
              <div class="container">
                ${emailContent}
              </div>
            </body>
          </html>
        `;

        await sendEmail({
          to: repEmail,
          subject: emailSubject,
          html: emailContent,
        });

        return "sent";
      });
    }

    if (tasks.length === 0) {
      return NextResponse.json({
        success: true,
        jobId: null,
        total: recipients.length,
        toSend: 0,
        preSkipped,
        message: "No emails to send",
      });
    }

    const jobId = `reminder-${formId}-${Date.now()}`;
    const scope = `reminders-${formId}`;

    try {
      emailJobManager.startJob(jobId, scope, tasks);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("already running")
      ) {
        return NextResponse.json(
          {
            error: "A reminder job is already running for this form",
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
      total: recipients.length,
      toSend: tasks.length,
      preSkipped,
    });
  } catch (error) {
    console.error("Error in send-reminders route:", error);
    return NextResponse.json(
      {
        error: "Failed to send reminders",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
