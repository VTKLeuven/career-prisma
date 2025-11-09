// app/api/password/request/route.ts
import { NextRequest, NextResponse } from "next/server";

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

    // Normalize URL: remove trailing slashes and ensure single trailing slash
    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Request password reset from Directus (server-side, no CORS issues)
    const resetRes = await fetch(`${normalizedBase}auth/password/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!resetRes.ok) {
      // Try to parse error response
      let errorMessage = "Failed to request password reset";
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

    // Success - Directus will send an email with the reset token
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

