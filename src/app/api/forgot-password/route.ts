// app/api/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendEmail } from "@/lib/repos/directus";
import { generatePasswordResetEmailHtml } from "@/lib/email-templates";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "DIRECTUS_URL not configured" },
        { status: 500 }
      );
    }

    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    if (!serverToken) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Find user by email
    const userRes = await fetch(
      `${normalizedBase}users?filter[email][_eq]=${encodeURIComponent(email)}&fields=id,email,first_name,last_name,status`,
      {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      }
    );

    if (!userRes.ok) {
      return NextResponse.json(
        { error: "Failed to process request" },
        { status: 500 }
      );
    }

    const userData = await userRes.json();
    const users = userData.data || [];

    // Don't reveal if user exists or not for security reasons
    // Always return success message
    if (users.length === 0) {
      // User doesn't exist, but we don't reveal this
      return NextResponse.json({ 
        success: true, 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    }

    const user = users[0];

    // Check if user is active (not suspended, etc.)
    if (user.status && user.status !== "active" && user.status !== "invited") {
      // User exists but account is not active - still don't reveal this
      return NextResponse.json({ 
        success: true, 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    }

    // Generate reset token
    const randomToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto
      .createHash("sha256")
      .update(randomToken)
      .digest("hex");

    // Create reset token: base64(userId:randomToken)
    const resetToken = Buffer.from(`${user.id}:${randomToken}`).toString("base64url");

    // Store token hash and expiration in user metadata
    try {
      const userRes = await fetch(
        `${normalizedBase}users/${user.id}?fields=metadata`,
        {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        }
      );

      let userMetadata: Record<string, any> = {};
      if (userRes.ok) {
        const userData = await userRes.json();
        userMetadata = userData.data?.metadata || {};
      }

      // Store reset token with expiration (1 hour)
      const expirationTime = new Date();
      expirationTime.setHours(expirationTime.getHours() + 1);

      userMetadata.password_reset_token_hash = tokenHash;
      userMetadata.password_reset_token_created = new Date().toISOString();
      userMetadata.password_reset_token_expires = expirationTime.toISOString();

      await fetch(
        `${normalizedBase}users/${user.id}`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${serverToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            metadata: userMetadata,
          }),
        }
      );
    } catch (err) {
      console.error("Error storing reset token:", err);
      // Continue even if metadata update fails - token is still valid
    }

    // Generate reset URL
    const frontendBaseUrl = process.env.NEXT_PUBLIC_APP_URL 
      || process.env.NEXT_PUBLIC_FORM_DOMAIN 
      || (process.env.DIRECTUS_URL ? process.env.DIRECTUS_URL.replace(/\/api.*$/, "") : "http://localhost:3000");
    
    const resetUrl = `${frontendBaseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    // Send password reset email
    try {
      const emailHtml = generatePasswordResetEmailHtml({
        firstName: user.first_name || undefined,
        lastName: user.last_name || undefined,
        resetUrl,
      });

      await sendEmail({
        to: user.email,
        subject: "Reset Your Password - VTK Career Platform",
        html: emailHtml,
      });
    } catch (emailError) {
      console.error("Error sending password reset email:", emailError);
      // Don't reveal email sending failure to user
    }

    return NextResponse.json({ 
      success: true, 
      message: "If an account with that email exists, a password reset link has been sent." 
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

