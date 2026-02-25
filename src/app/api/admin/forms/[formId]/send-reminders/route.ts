import { NextRequest, NextResponse } from "next/server";
import { getServerDirectusClient } from "@/lib/directus";
import { readItems, readItem } from "@directus/sdk";
import { sendEmail } from "@/lib/repos/directus";
import { getUserFromCookies } from "@/lib/auth-server";
import { cookies } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    // Check authentication
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

    // Get form version details
    const formVersion = await client.request(
      readItem("form_versions" as any, formVersionId, {
        fields: ["*", { form_id: ["id", "name", "slug"] }, "metadata"],
      })
    ) as any;

    if (!formVersion) {
      return NextResponse.json({ error: "Form version not found" }, { status: 404 });
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

    // Build form URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_FORM_DOMAIN || "http://localhost:3000";
    const formUrl = `${baseUrl}/forms/company/${eventId}/${form.slug}`;

    // Get company details for placeholders
    const companyIds = [...new Set(recipients.map((r: any) => r.companyId))];
    const companies = await client.request(
      readItems("company" as any, {
        fields: ["id", "name"],
        filter: {
          id: { _in: companyIds },
        },
        limit: -1,
      })
    ) as any[];

    const companyMap = new Map(companies.map((c: any) => [c.id, c.name]));

    // Get representative details
    const repIds = recipients.map((r: any) => r.repId);
    const representatives = await client.request(
      readItems("directus_users" as any, {
        fields: ["id", "first_name", "last_name", "email"] as any,
        filter: {
          id: { _in: repIds },
        },
        limit: -1,
      })
    ) as any[];

    const repMap = new Map(representatives.map((r: any) => [r.id, r]));

    // Send emails to selected recipients
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      const rep = repMap.get(recipient.repId);
      const companyName = companyMap.get(recipient.companyId) || "Unknown Company";

      if (!rep || !rep.email) {
        failed++;
        errors.push(`${companyName} - ${recipient.email || 'Unknown'}: No email address`);
        continue;
      }

      try {
        const repName = [rep.first_name, rep.last_name].filter(Boolean).join(" ") || "there";

        // Replace placeholders in subject and content
        let emailSubject = subject
          .replace(/{name}/g, repName)
          .replace(/{company}/g, companyName)
          .replace(/{form_name}/g, form.name);

        // Create clickable link HTML for form_link placeholder
        const formLinkHtml = `<a href="${formUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 500;">Complete Form</a><br><br><p style="word-break: break-all; color: #2563eb;">${formUrl}</p>`;

        let emailContent = content
          .replace(/{name}/g, repName)
          .replace(/{company}/g, companyName)
          .replace(/{form_name}/g, form.name)
          .replace(/{form_link}/g, formLinkHtml);

        // Convert newlines to <br> if content doesn't appear to be HTML
        if (!emailContent.includes('<') || !emailContent.includes('>')) {
          emailContent = emailContent.replace(/\n/g, '<br>');
        }

        // Wrap in basic HTML structure if not already HTML
        if (!emailContent.includes('<p>') && !emailContent.includes('<div>')) {
          emailContent = `<p>${emailContent.replace(/<br>/g, '</p><p>')}</p>`;
        }

        // Wrap in full HTML email template
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
          to: rep.email,
          subject: emailSubject,
          html: emailContent,
        });

        sent++;
      } catch (error) {
        failed++;
        errors.push(`${companyName} - ${rep.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`Error sending reminder to ${rep.email}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
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

