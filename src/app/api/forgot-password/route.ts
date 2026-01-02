// app/api/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
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

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // We need server token to generate and store the reset token ourselves
    // This avoids Directus sending its own email
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    
    if (!serverToken) {
      console.error("[forgot-password] DIRECTUS_SERVER_TOKEN not configured - cannot generate reset token");
      // Still return success for security (don't reveal if email exists)
      return NextResponse.json({ 
        success: true, 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    }

    try {
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
        // Don't reveal if user exists - always return success
        return NextResponse.json({ 
          success: true, 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }

      const userData = await userRes.json();
      const users = userData.data || [];
      
      if (users.length === 0) {
        // User doesn't exist - return success anyway (security best practice)
        return NextResponse.json({ 
          success: true, 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }

      const user = users[0];
      
      // Check if user is active (not suspended, etc.)
      if (!user.status || (user.status !== "active" && user.status !== "invited")) {
        // User exists but is not active - still return success
        return NextResponse.json({ 
          success: true, 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }

      // Generate secure random token using crypto
      // Using hex encoding which is simpler and more compatible
      const crypto = await import("crypto");
      const randomToken = crypto.randomBytes(32).toString("hex");
      
      console.log(`[forgot-password] Generated reset token for user ${user.id}, length: ${randomToken.length}`);
      
      // Store the token in the user's password_reset_token field
      // Directus expects this field to contain the reset token
      const updateRes = await fetch(
        `${normalizedBase}users/${user.id}`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${serverToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password_reset_token: randomToken,
          }),
        }
      );

      if (!updateRes.ok) {
        const errorData = await updateRes.json().catch(() => null);
        console.error(`[forgot-password] Failed to set reset token for user ${user.id}:`, errorData);
        // Still return success for security
        return NextResponse.json({ 
          success: true, 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }

      // Verify the token was stored correctly by fetching it back
      const verifyRes = await fetch(
        `${normalizedBase}users/${user.id}?fields=password_reset_token`,
        {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        }
      );

      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        const storedToken = verifyData.data?.password_reset_token;
        if (storedToken === randomToken) {
          console.log(`[forgot-password] Token verified - stored correctly for user ${user.id}`);
        } else {
          console.warn(`[forgot-password] Token mismatch! Generated: ${randomToken.substring(0, 20)}..., Stored: ${storedToken?.substring(0, 20)}...`);
        }
      }

      // Generate the reset URL
      // base64url encoding is already URL-safe, so we can use it directly
      // However, we'll still encode it to be safe with any edge cases
      const frontendBaseUrl = process.env.NEXT_PUBLIC_APP_URL 
        || process.env.NEXT_PUBLIC_FORM_DOMAIN 
        || (process.env.DIRECTUS_URL ? process.env.DIRECTUS_URL.replace(/\/api.*$/, "") : "http://localhost:3000");
      
      // Use the token directly since base64url is URL-safe, but encodeURIComponent is also safe
      const resetUrl = `${frontendBaseUrl}/reset-password?token=${encodeURIComponent(randomToken)}`;
      
      console.log(`[forgot-password] Reset URL generated for user ${user.id}`);
      console.log(`[forgot-password] Token in URL (first 30 chars): ${randomToken.substring(0, 30)}...`);
      
      // Send email using our own service
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
        
        console.log(`[forgot-password] Password reset email sent to ${user.email}`);
      } catch (emailError) {
        console.error(`[forgot-password] Error sending password reset email:`, emailError);
        // Don't reveal email sending failure to user
      }

      // Always return success (security best practice - don't reveal if email exists)
      return NextResponse.json({ 
        success: true, 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    } catch (err) {
      console.error(`[forgot-password] Error processing password reset request:`, err);
      // Don't reveal errors to user for security
      return NextResponse.json({ 
        success: true, 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    }
  } catch (error) {
    console.error("Error in forgot password:", error);
    // Don't reveal errors to user for security
    return NextResponse.json({ 
      success: true, 
      message: "If an account with that email exists, a password reset link has been sent." 
    });
  }
}
