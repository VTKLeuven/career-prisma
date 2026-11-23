import { after, NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/repos/users";
import { sendEmail } from "@/lib/email";
import {
  generateInvitationEmailHtml,
  generatePasswordResetEmailHtml,
} from "@/lib/email-templates";
import { generateInviteTokenServer } from "@/lib/invite-token";
import { createUserPasswordResetToken } from "@/lib/password-reset";
import { allowResetEmail } from "@/lib/login-throttle";
import { loggableEmail, logSystemEvent } from "@/lib/repos/system-logs";

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

  // Looked up and mailed after responding, so the answer comes back at once
  // and equally fast whether or not the account exists.
  after(async () => {
    // Throttled requests are not logged either, so the form cannot be used
    // to fill the log.
    if (!allowResetEmail(email)) return;
    try {
      const user = await findUserByEmail(email);
      if (
        !user?.email ||
        (user.status !== "active" && user.status !== "invited")
      ) {
        // The visitor is told a link was sent either way; the log is where an
        // admin finds out that nothing was.
        await logSystemEvent({
          source: "user_accounts",
          level: "info",
          event: "password_reset_ignored",
          capped: true,
          message: `Password reset requested for ${loggableEmail(email)}; no email sent (${user ? `account ${user.status}` : "no account"})`,
          details: {
            email: loggableEmail(email),
            reason: user ? `status_${user.status ?? "unknown"}` : "no_account",
            ...(user && { userId: user.id }),
          },
        });
        return;
      }

      if (user.status === "invited") {
        const invite = await generateInviteTokenServer(user.id);
        if (invite) {
          const acceptInviteUrl = `${applicationUrl()}/accept-invite?token=${encodeURIComponent(invite.token)}`;
          await logSystemEvent({
            source: "user_accounts",
            level: "info",
            event: "invite_resent",
            message: `${user.email} asked for a password reset before accepting their invite; invite sent again`,
            details: { userId: user.id, email: user.email },
          });
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
        await logSystemEvent({
          source: "user_accounts",
          level: "info",
          event: "password_reset_requested",
          message: `${user.email} requested a password reset`,
          details: { userId: user.id, email: user.email },
        });
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
      await logSystemEvent({
        source: "user_accounts",
        level: "error",
        event: "password_reset_failed",
        message: `Could not send the password email to ${loggableEmail(email)}: ${error instanceof Error ? error.message : String(error)}`,
        details: { email: loggableEmail(email) },
      });
    }
  });

  return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
}
