import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  generateInvitationEmailHtml,
  generatePasswordResetEmailHtml,
} from "@/lib/email-templates";
import { generateInviteTokenServer } from "@/lib/invite-token";
import { createUserPasswordResetToken } from "@/lib/password-reset";

const GENERIC_MESSAGE =
  "If an account with that email exists, a password reset link has been sent.";

function applicationUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_FORM_DOMAIN ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export async function POST(request: NextRequest) {
  const { email } = await request.json().catch(() => ({ email: null }));
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (
      !user?.email ||
      (user.status !== "active" && user.status !== "invited")
    ) {
      return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
    }

    if (user.status === "invited") {
      const invite = await generateInviteTokenServer(user.id);
      if (invite) {
        const acceptInviteUrl = `${applicationUrl()}/accept-invite?token=${encodeURIComponent(invite.token)}`;
        await sendEmail({
          to: user.email,
          subject: "Complete Your Registration - VTK Career Platform",
          html: generateInvitationEmailHtml({
            firstName: user.first_name || undefined,
            lastName: user.last_name || undefined,
            acceptInviteUrl,
          }),
        });
      }
    } else {
      const token = await createUserPasswordResetToken(user.id);
      const resetUrl = `${applicationUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: user.email,
        subject: "Reset Your Password - VTK Career Platform",
        html: generatePasswordResetEmailHtml({
          firstName: user.first_name || undefined,
          lastName: user.last_name || undefined,
          resetUrl,
        }),
      });
    }
  } catch (error) {
    console.error("[password/request] Failed to send password email:", error);
  }

  return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
}
