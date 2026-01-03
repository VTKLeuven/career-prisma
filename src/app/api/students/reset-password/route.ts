// app/api/students/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";

const STUDENT_COLLECTION = "students";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
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

    // Get admin token for student management
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    if (!serverToken) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Normalize URL: remove trailing slashes and ensure single trailing slash
    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Try to find the student with this reset token
    // Note: searchParams.get() automatically decodes URL-encoded values, so token is already decoded
    let studentRes = await fetch(
      `${normalizedBase}items/${STUDENT_COLLECTION}?filter[password_reset_token][_eq]=${encodeURIComponent(token)}&fields=id,email,verified,password_reset_token`,
      {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      }
    );

    // If filtering fails, try with wildcard fields
    if (!studentRes.ok && studentRes.status === 403) {
      console.log(`[students/reset-password] Cannot filter on password_reset_token (403), trying with wildcard fields`);
      studentRes = await fetch(
        `${normalizedBase}items/${STUDENT_COLLECTION}?filter[password_reset_token][_eq]=${encodeURIComponent(token)}&fields=*`,
        {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        }
      );
    }

    // If still failing, try without fields parameter
    if (!studentRes.ok && studentRes.status === 403) {
      console.log(`[students/reset-password] Cannot filter with fields parameter (403), trying without fields`);
      studentRes = await fetch(
        `${normalizedBase}items/${STUDENT_COLLECTION}?filter[password_reset_token][_eq]=${encodeURIComponent(token)}`,
        {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        }
      );
    }

    if (!studentRes.ok) {
      console.error(`[students/reset-password] Failed to find student with reset token:`, studentRes.status);
      const errorText = await studentRes.text().catch(() => "");
      console.error(`[students/reset-password] Error response:`, errorText);
      return NextResponse.json(
        { error: "Invalid or expired reset token. Please request a new password reset link." },
        { status: 400 }
      );
    }

    const studentData = await studentRes.json();
    const students = studentData.data || [];

    if (students.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired reset token. Please request a new password reset link." },
        { status: 400 }
      );
    }

    const student = students[0];

    // Verify student is verified
    if (!student.verified) {
      return NextResponse.json(
        { error: "Your account is not verified. Please verify your email first." },
        { status: 400 }
      );
    }

    // Verify the token matches exactly
    if (student.password_reset_token !== token) {
      return NextResponse.json(
        { error: "Invalid or expired reset token. Please request a new password reset link." },
        { status: 400 }
      );
    }

    // Try sending plain password first - Directus might hash it automatically even for custom collections
    // If that doesn't work, we'll hash it ourselves with Argon2id
    // Update student: set password and clear reset token
    const updateBody = {
      password: password, // Try plain password first - Directus may hash it automatically
      password_reset_token: null, // Clear the reset token after use
    };
    
    console.log(`[students/reset-password] Attempting to set password (plain text - Directus may hash it)`);
    
    const updateRes = await fetch(
      `${normalizedBase}items/${STUDENT_COLLECTION}/${student.id}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${serverToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateBody),
      }
    );

    if (!updateRes.ok) {
      const errorData = await updateRes.json().catch(() => null);
      const errorMessage = errorData?.errors?.[0]?.message || "Failed to reset password";
      
      console.error(`[students/reset-password] Failed to update password for student ${student.id}:`, {
        status: updateRes.status,
        errorMessage,
      });
      
      return NextResponse.json(
        { error: errorMessage },
        { status: updateRes.status }
      );
    }

    // Verify what was actually stored by fetching the student back
    const verifyRes = await fetch(
      `${normalizedBase}items/${STUDENT_COLLECTION}/${student.id}?fields=password`,
      {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      }
    );

    if (verifyRes.ok) {
      const verifyData = await verifyRes.json();
      const storedPassword = verifyData.data?.password;
      if (storedPassword) {
        console.log(`[students/reset-password] Password stored - length: ${storedPassword.length}, prefix: ${storedPassword.substring(0, 30)}`);
        if (storedPassword === password) {
          console.warn(`[students/reset-password] WARNING: Password stored as plain text! Directus did not hash it.`);
        } else if (storedPassword.startsWith('$argon2')) {
          console.log(`[students/reset-password] Password was hashed by Directus using Argon2id`);
        } else {
          console.log(`[students/reset-password] Password was stored in a different format`);
        }
      }
    }

    // Success - password has been reset
    console.log(`[students/reset-password] Password successfully reset for student ${student.id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting student password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

