// app/api/password/reset/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
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

    // Reset password via Directus (server-side, no CORS issues)
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
      } catch {
        // If JSON parsing fails, use status text or default message
        errorMessage = resetRes.statusText || errorMessage;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: resetRes.status }
      );
    }

    // Success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

