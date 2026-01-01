import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/repos/directus";

export async function POST(req: Request) {
  try {
    const { name, email, question } = await req.json();

    // Validate required fields
    if (!name || !email || !question) {
      return NextResponse.json(
        { error: "Name, email, and question are required." },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
      );
    }

    // Format the email content
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
            .question { background-color: white; padding: 15px; border-left: 4px solid #0b4d8c; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Contact Form Submission</h2>
            </div>
            <div class="content">
              <div class="field">
                <span class="label">Name:</span>
                <span class="value">${escapeHtml(name)}</span>
              </div>
              <div class="field">
                <span class="label">Email:</span>
                <span class="value">${escapeHtml(email)}</span>
              </div>
              <div class="field">
                <span class="label">Question/Message:</span>
                <div class="question">${escapeHtml(question).replace(/\n/g, '<br>')}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email to tiddo.nees@vtk.be
    await sendEmail({
      to: "tiddo.nees@vtk.be",
      subject: `Contact Form: ${escapeHtml(name)}`,
      html: emailHtml,
    });

    return NextResponse.json(
      { message: "Contact form submitted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending contact form email:", error);
    return NextResponse.json(
      { error: "Failed to send contact form. Please try again later." },
      { status: 500 }
    );
  }
}

// Helper function to escape HTML to prevent XSS
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

