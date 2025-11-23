// app/api/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";

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

    // Normalize URL: remove trailing slashes and ensure single trailing slash
    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Use Directus's public password reset endpoint (no authentication required)
    // This is a public endpoint that anyone can use to reset their password with a valid token
    // It handles token validation and password reset internally
    // No metadata access or admin permissions required
    const resetRes = await fetch(`${normalizedBase}auth/password/reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, password }),
    });

    if (!resetRes.ok) {
      // Try to parse error response
      let errorMessage = "Failed to reset password";
      try {
        const errorData = await resetRes.json();
        errorMessage = errorData?.errors?.[0]?.message || errorMessage;
        
        // Map common Directus error messages to user-friendly ones
        if (errorMessage.includes("expired") || errorMessage.includes("invalid")) {
          errorMessage = "Invalid or expired reset token. Please request a new password reset link.";
        }
      } catch {
        // If JSON parsing fails, use status text or default message
        errorMessage = resetRes.statusText || errorMessage;
      }
      
      console.error(`[reset-password] Directus password reset failed:`, {
        status: resetRes.status,
        errorMessage,
      });
      
      return NextResponse.json(
        { error: errorMessage },
        { status: resetRes.status }
      );
    }

    // Success - password has been reset
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
