import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/repos/directus";
import { getVacancyById } from "@/lib/repos/vacancies";
import type { Company } from "@/lib/schema";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
];

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const vacancyId = formData.get("vacancyId") as string;
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const subject = formData.get("subject") as string;
    const message = formData.get("message") as string;
    const fileEntries = formData.getAll("files") as File[];

    if (!vacancyId || !name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields (name, email, subject, message) are required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
      );
    }

    // Validate files
    const attachments: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }> = [];

    for (const file of fileEntries) {
      if (!file || !file.name || file.size === 0) continue;

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the 10MB size limit.` },
          { status: 400 }
        );
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: `File type "${file.type}" is not allowed. Accepted: PDF, DOC, DOCX, TXT, PNG, JPG.`,
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      attachments.push({
        filename: file.name,
        content: buffer,
        contentType: file.type,
      });
    }

    // Fetch vacancy to get contact_email (server token read; only published accept mail)
    const vacancy = await getVacancyById(vacancyId, true);
    if (!vacancy || vacancy.status !== "published") {
      return NextResponse.json(
        { error: "Vacancy not found." },
        { status: 404 }
      );
    }

    const companyName =
      typeof vacancy.company === "object"
        ? (vacancy.company as Company).name
        : "Unknown Company";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0b4d8c; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #555; margin-bottom: 5px; display: block; }
            .value { color: #333; }
            .message { background-color: white; padding: 15px; border-left: 4px solid #0b4d8c; margin-top: 10px; }
            .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Message for: ${escapeHtml(vacancy.title)}</h2>
            </div>
            <div class="content">
              <div class="field">
                <span class="label">From:</span>
                <span class="value">${escapeHtml(name)} (${escapeHtml(email)})</span>
              </div>
              <div class="field">
                <span class="label">Subject:</span>
                <span class="value">${escapeHtml(subject)}</span>
              </div>
              <div class="field">
                <span class="label">Message:</span>
                <div class="message">${escapeHtml(message).replace(/\n/g, "<br>")}</div>
              </div>
              ${
                attachments.length > 0
                  ? `<div class="field">
                      <span class="label">Attachments:</span>
                      <span class="value">${attachments.map((a) => escapeHtml(a.filename)).join(", ")}</span>
                    </div>`
                  : ""
              }
              <div class="footer">
                <p>This message was sent via the VTK Career vacancy platform for the position "${escapeHtml(vacancy.title)}" at ${escapeHtml(companyName)}.</p>
                <p>You can reply directly to ${escapeHtml(email)} to respond to this candidate.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to: vacancy.contact_email,
      subject: `[VTK Career] ${subject}`,
      html: emailHtml,
      replyTo: email,
      attachments:
        attachments.length > 0
          ? attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
              contentType: a.contentType,
            }))
          : undefined,
    });

    return NextResponse.json(
      { message: "Message sent successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending vacancy contact email:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
