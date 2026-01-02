// app/api/students/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { findStudentByEmail, createNonOAuthStudent, generateStudentVerificationToken } from "@/lib/repos/students";
import { sendEmail } from "@/lib/repos/directus";
import { generateStudentVerificationEmailHtml } from "@/lib/email-templates";

export async function POST(request: NextRequest) {
  try {
    const { first_name, last_name, email, university_status, university } = await request.json();

    if (!first_name || !last_name || !email || !university) {
      return NextResponse.json(
        { error: "First name, last name, email, and university are required." },
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

    // Check if student already exists
    const existingStudent = await findStudentByEmail(email);
    if (existingStudent) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Generate a unique username (using email prefix or random string)
    const emailPrefix = email.split("@")[0];
    const timestamp = Date.now();
    const username = `external_${emailPrefix}_${timestamp}`;

    // Create student
    const student = await createNonOAuthStudent({
      username,
      first_name,
      last_name,
      full_name: `${first_name} ${last_name}`,
      email,
      university_status: university_status || null,
      university: university,
      in_workinggroup: false,
    });

    if (!student) {
      return NextResponse.json(
        { error: "Failed to create student account. Please try again." },
        { status: 500 }
      );
    }

    // Generate verification token
    const tokenData = await generateStudentVerificationToken(student.id);
    
    if (tokenData && tokenData.token) {
      // Build verification URL
      const frontendBaseUrl = process.env.NEXT_PUBLIC_APP_URL 
        || process.env.NEXT_PUBLIC_FORM_DOMAIN 
        || (process.env.DIRECTUS_URL ? process.env.DIRECTUS_URL.replace(/\/api.*$/, "") : "http://localhost:3000");
      
      const verificationUrl = `${frontendBaseUrl}/verify-student?token=${encodeURIComponent(tokenData.token)}`;
      
      // Send verification email
      try {
        const emailHtml = generateStudentVerificationEmailHtml({
          firstName: first_name,
          lastName: last_name,
          verificationUrl,
        });

        await sendEmail({
          to: email,
          subject: "Verify Your Email - VTK Career Platform",
          html: emailHtml,
        });

        console.log(`[students/register] Verification email sent to ${email}`);
      } catch (emailError) {
        console.error(`[students/register] Error sending verification email:`, emailError);
        // Don't fail registration if email fails - user can request resend
      }
    } else {
      console.error(`[students/register] Failed to generate verification token for student ${student.id}`);
    }

    // Don't set session cookie - user needs to verify email first
    return NextResponse.json({ 
      success: true,
      message: "Registration successful! Please check your email to verify your account and set your password.",
    });
  } catch (error) {
    console.error("Student registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}



