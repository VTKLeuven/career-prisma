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

    // Get admin token for user management
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    if (!serverToken) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Normalize URL: remove trailing slashes and ensure single trailing slash
    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Try to find the user with this reset token
    // Note: searchParams.get() automatically decodes URL-encoded values, so token is already decoded
    let userRes = await fetch(
      `${normalizedBase}users?filter[password_reset_token][_eq]=${encodeURIComponent(token)}&fields=id,email,status,password_reset_token`,
      {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      }
    );

    // If filtering fails, try with wildcard fields
    if (!userRes.ok && userRes.status === 403) {
      console.log(`[reset-password] Cannot filter on password_reset_token (403), trying with wildcard fields`);
      userRes = await fetch(
        `${normalizedBase}users?filter[password_reset_token][_eq]=${encodeURIComponent(token)}&fields=*`,
        {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        }
      );
    }

    // If still failing, try without fields parameter
    if (!userRes.ok && userRes.status === 403) {
      console.log(`[reset-password] Cannot filter with fields parameter (403), trying without fields`);
      userRes = await fetch(
        `${normalizedBase}users?filter[password_reset_token][_eq]=${encodeURIComponent(token)}`,
        {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        }
      );
    }

    if (!userRes.ok) {
      console.error(`[reset-password] Failed to find user with reset token:`, userRes.status);
      const errorText = await userRes.text().catch(() => "");
      console.error(`[reset-password] Error response:`, errorText);
      return NextResponse.json(
        { error: "Invalid or expired reset token. Please request a new password reset link." },
        { status: 400 }
      );
    }

    const userData = await userRes.json();
    const users = userData.data || [];

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired reset token. Please request a new password reset link." },
        { status: 400 }
      );
    }

    const user = users[0];

    // Verify user is active (not suspended, etc.)
    if (user.status !== "active" && user.status !== "invited") {
      return NextResponse.json(
        { error: "Your account is not active. Please contact support." },
        { status: 400 }
      );
    }

    // Verify the token matches exactly
    if (user.password_reset_token !== token) {
      return NextResponse.json(
        { error: "Invalid or expired reset token. Please request a new password reset link." },
        { status: 400 }
      );
    }

    // Update user: set password and clear reset token
    const updateBody = {
      password,
      password_reset_token: null, // Clear the reset token after use
    };

    const updateRes = await fetch(
      `${normalizedBase}users/${user.id}`,
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

      console.error(`[reset-password] Failed to update password for user ${user.id}:`, {
        status: updateRes.status,
        errorMessage,
      });

      return NextResponse.json(
        { error: errorMessage },
        { status: updateRes.status }
      );
    }

    // Success - password has been reset
    console.log(`[reset-password] Password successfully reset via Directus`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
