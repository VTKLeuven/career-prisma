// app/api/invite/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    if (!userId && !email) {
      return NextResponse.json(
        { error: "User ID or email is required" },
        { status: 400 }
      );
    }

    const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
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

    // Find user if email provided
    let user = null;
    if (email && !userId) {
      const userRes = await fetch(
        `${normalizedBase}users?filter[email][_eq]=${email}&fields=id,email,status`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (userRes.ok) {
        const userData = await userRes.json();
        user = userData.data?.[0];
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
      }
    } else if (userId) {
      const userRes = await fetch(
        `${normalizedBase}users/${userId}?fields=id,email,status`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (userRes.ok) {
        user = (await userRes.json()).data;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Generate secure random token
    const randomToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto
      .createHash("sha256")
      .update(randomToken)
      .digest("hex");

    // Create invite token: base64(userId:randomToken)
    const inviteToken = Buffer.from(`${user.id}:${randomToken}`).toString("base64url");

    // Store token hash and creation time in user metadata
    const userRes = await fetch(
      `${normalizedBase}users/${user.id}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metadata: {
            invite_token_hash: tokenHash,
            invite_token_created: new Date().toISOString(),
          },
        }),
      }
    );

    if (!userRes.ok) {
      const errorData = await userRes.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.errors?.[0]?.message || "Failed to generate invite token" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      token: inviteToken,
      email: user.email,
    });
  } catch (error) {
    console.error("Error generating invite token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

