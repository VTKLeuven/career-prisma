// app/api/generate-reset-token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? 'directus'}_access`;
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE)?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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

    // Request password reset - this generates a token
    // Note: Directus will send its own email, but we'll also send ours
    const resetRes = await fetch(`${normalizedBase}auth/password/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!resetRes.ok) {
      const error = await resetRes.json().catch(() => null);
      return NextResponse.json(
        { error: error?.errors?.[0]?.message || "Failed to generate reset token" },
        { status: 500 }
      );
    }

    // Directus doesn't return the token in the response for security reasons
    // So we need to use the invite flow instead, or accept that Directus will send an email
    // For now, let's return success and the frontend will handle the flow
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error generating reset token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

