// app/api/students/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/repos/directus";
import { generatePasswordResetEmailHtml } from "@/lib/email-templates";

const STUDENT_COLLECTION = "students";

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
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    
    if (!serverToken) {
      console.error("[students/forgot-password] DIRECTUS_SERVER_TOKEN not configured - cannot generate reset token");
      // Still return success for security (don't reveal if email exists)
      return NextResponse.json({ 
        success: true, 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    }

    try {
      // Find student by email
      const studentRes = await fetch(
        `${normalizedBase}items/${STUDENT_COLLECTION}?filter[email][_eq]=${encodeURIComponent(email)}&fields=id,email,first_name,last_name,verified`,
        {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        }
      );

      if (!studentRes.ok) {
        // Don't reveal if student exists - always return success
        return NextResponse.json({ 
          success: true, 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }

      const studentData = await studentRes.json();
      const students = studentData.data || [];
      
      if (students.length === 0) {
        // Student doesn't exist - return success anyway (security best practice)
        return NextResponse.json({ 
          success: true, 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }

      const student = students[0];
      
      // Check if student is verified (must be verified to reset password)
      if (!student.verified) {
        // Student exists but is not verified - still return success
        return NextResponse.json({ 
          success: true, 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }

      // Generate secure random token using crypto
      const crypto = await import("crypto");
      const randomToken = crypto.randomBytes(32).toString("hex");
      
      console.log(`[students/forgot-password] Generated reset token for student ${student.id}, length: ${randomToken.length}`);
      
      // Store the token in the student's password_reset_token field
      const updateRes = await fetch(
        `${normalizedBase}items/${STUDENT_COLLECTION}/${student.id}`,
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
        console.error(`[students/forgot-password] Failed to set reset token for student ${student.id}:`, errorData);
        // Still return success for security
        return NextResponse.json({ 
          success: true, 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }

      // Verify the token was stored correctly by fetching it back
      const verifyRes = await fetch(
        `${normalizedBase}items/${STUDENT_COLLECTION}/${student.id}?fields=password_reset_token`,
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
          console.log(`[students/forgot-password] Token verified - stored correctly for student ${student.id}`);
        } else {
          console.warn(`[students/forgot-password] Token mismatch! Generated: ${randomToken.substring(0, 20)}..., Stored: ${storedToken?.substring(0, 20)}...`);
        }
      }

      // Generate the reset URL
      const frontendBaseUrl = process.env.NEXT_PUBLIC_APP_URL 
        || process.env.NEXT_PUBLIC_FORM_DOMAIN 
        || (process.env.DIRECTUS_URL ? process.env.DIRECTUS_URL.replace(/\/api.*$/, "") : "http://localhost:3000");
      
      const resetUrl = `${frontendBaseUrl}/student-reset-password?token=${encodeURIComponent(randomToken)}`;
      
      console.log(`[students/forgot-password] Reset URL generated for student ${student.id}`);
      console.log(`[students/forgot-password] Token in URL (first 30 chars): ${randomToken.substring(0, 30)}...`);
      
      // Send email using our own service
      try {
        const emailHtml = generatePasswordResetEmailHtml({
          firstName: student.first_name || undefined,
          lastName: student.last_name || undefined,
          resetUrl,
        });

        await sendEmail({
          to: student.email,
          subject: "Reset Your Password - VTK Career Platform",
          html: emailHtml,
        });
        
        console.log(`[students/forgot-password] Password reset email sent to ${student.email}`);
      } catch (emailError) {
        console.error(`[students/forgot-password] Error sending password reset email:`, emailError);
        // Don't reveal email sending failure to user
      }

      // Always return success (security best practice - don't reveal if email exists)
      return NextResponse.json({ 
        success: true, 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    } catch (err) {
      console.error(`[students/forgot-password] Error processing password reset request:`, err);
      // Don't reveal errors to user for security
      return NextResponse.json({ 
        success: true, 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    }
  } catch (error) {
    console.error("Error in student forgot password:", error);
    // Don't reveal errors to user for security
    return NextResponse.json({ 
      success: true, 
      message: "If an account with that email exists, a password reset link has been sent." 
    });
  }
}



