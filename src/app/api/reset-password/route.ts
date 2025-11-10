// app/api/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

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

    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    if (!serverToken) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Decode token to get userId
    let userId: string | null = null;
    let tokenHash: string | null = null;

    try {
      const decoded = Buffer.from(token, "base64url").toString("utf-8");
      const [id, rawToken] = decoded.split(":");
      
      if (!id || !rawToken) {
        return NextResponse.json(
          { error: "Invalid reset token format" },
          { status: 400 }
        );
      }

      userId = id;
      tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
    } catch {
      return NextResponse.json(
        { error: "Invalid reset token format" },
        { status: 400 }
      );
    }

    // Fetch user and verify token
    const userRes = await fetch(
      `${normalizedBase}users/${userId}?fields=id,email,status,metadata`,
      {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      }
    );

    if (!userRes.ok) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    const userData = await userRes.json();
    const user = userData.data;
    const userMetadata = user.metadata || {};

    // Verify token hash
    const storedTokenHash = userMetadata.password_reset_token_hash;
    if (!storedTokenHash || storedTokenHash !== tokenHash) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Check token expiration
    const tokenExpires = userMetadata.password_reset_token_expires;
    if (tokenExpires) {
      const expirationDate = new Date(tokenExpires);
      const now = new Date();
      if (now > expirationDate) {
        return NextResponse.json(
          { error: "Reset token has expired. Please request a new one." },
          { status: 400 }
        );
      }
    }

    // Update password and clear reset token
    const updateRes = await fetch(
      `${normalizedBase}users/${user.id}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${serverToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          metadata: {
            ...userMetadata,
            password_reset_token_hash: null,
            password_reset_token_created: null,
            password_reset_token_expires: null,
          },
        }),
      }
    );

    if (!updateRes.ok) {
      const errorData = await updateRes.json().catch(() => null);
      const errorMessage = errorData?.errors?.[0]?.message || "Failed to reset password";
      return NextResponse.json(
        { error: errorMessage },
        { status: updateRes.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

