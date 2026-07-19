import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { generatePasswordResetEmailHtml } from "@/lib/email-templates";
import { createStudentPasswordResetToken } from "@/lib/password-reset";

const GENERIC_MESSAGE =
  "If an account with that email exists, a password reset link has been sent.";

export async function POST(request: NextRequest) {
  const { email } = await request.json().catch(() => ({ email: null }));
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (student?.verified) {
      const token = await createStudentPasswordResetToken(student.id);
      const baseUrl = (
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_FORM_DOMAIN ||
        "http://localhost:3000"
      ).replace(/\/+$/, "");
      await sendEmail({
        to: student.email,
        subject: "Reset Your Password - VTK Career Platform",
        html: generatePasswordResetEmailHtml({
          firstName: student.first_name || undefined,
          lastName: student.last_name || undefined,
          resetUrl: `${baseUrl}/student-reset-password?token=${encodeURIComponent(token)}`,
        }),
      });
    }
  } catch (error) {
    console.error("[students/forgot-password] Failed to send email:", error);
  }
  return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
}
