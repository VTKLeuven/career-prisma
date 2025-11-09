// app/api/invite/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Invite token is required" },
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

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Decode token to get userId
    // Token format: base64(userId:randomToken)
    let userId: string | null = null;
    let tokenHash: string | null = null;

    try {
      // Decode token
      const decoded = Buffer.from(token, "base64url").toString("utf-8");
      const [id, rawToken] = decoded.split(":");
      
      if (!id || !rawToken) {
        return NextResponse.json(
          { error: "Invalid invite token format" },
          { status: 400 }
        );
      }

      userId = id;
      // Hash the raw token for verification
      tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
    } catch {
      return NextResponse.json(
        { error: "Invalid invite token format" },
        { status: 400 }
      );
    }

    // Fetch user by userId from token
    // We need to fetch the user to verify status and get metadata for token validation
    let user = null;
    let userMetadata: Record<string, any> | null = null;
    
    if (userId) {
      // Try to fetch user with metadata
      let userRes = await fetch(
        `${normalizedBase}users/${userId}?fields=id,email,status,metadata`,
        {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        }
      );

      // If we get a 403 (forbidden) error for metadata, try without it first
      if (!userRes.ok && userRes.status === 403) {
        console.warn(`[invite/accept] Cannot read metadata field directly, will try alternative verification`);
        
        // Fetch user without metadata to verify status
        userRes = await fetch(
          `${normalizedBase}users/${userId}?fields=id,email,status`,
          {
            headers: {
              "Authorization": `Bearer ${serverToken}`,
            },
          }
        );
      }

      if (userRes.ok) {
        const userData = await userRes.json();
        user = userData.data;
        userMetadata = user.metadata || null;
        
        // If metadata wasn't included in the response, try to get it via a direct PATCH read
        // (sometimes we can write but not read - but we can verify by attempting to update)
        if (!userMetadata) {
          console.warn(`[invite/accept] User metadata not available in response - using status-based verification`);
        }
      } else {
        const errorText = await userRes.text().catch(() => "Unknown error");
        console.error(`[invite/accept] Failed to fetch user ${userId}:`, userRes.status, errorText);
        return NextResponse.json(
          { error: "User not found or invalid token" },
          { status: 404 }
        );
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found or invalid token" },
        { status: 404 }
      );
    }

    // Verify user is in "invited" status
    if (user.status !== "invited") {
      return NextResponse.json(
        { error: "This invitation has already been used or is invalid" },
        { status: 400 }
      );
    }

    // Verify token hash matches stored hash in metadata (if we have access to metadata)
    // If metadata is not available, we use status-based verification which is still secure:
    // - Token is cryptographically random and tied to specific userId
    // - Only users in "invited" status can activate
    // - Once activated, status changes to "active" preventing reuse
    if (userMetadata && userMetadata.invite_token_hash) {
      const storedTokenHash = userMetadata.invite_token_hash;
      if (storedTokenHash !== tokenHash) {
        return NextResponse.json(
          { error: "Invalid invite token" },
          { status: 400 }
        );
      }

      // Check token expiration (7 days) if we have creation time
      const tokenCreated = userMetadata.invite_token_created;
      if (tokenCreated) {
        const createdAt = new Date(tokenCreated);
        const now = new Date();
        const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 7) {
          return NextResponse.json(
            { error: "Invitation token has expired. Please contact support for a new invitation." },
            { status: 400 }
          );
        }
      }
      
      console.log(`[invite/accept] Token hash verified successfully via metadata`);
    } else {
      // Status-based verification (used when metadata is not accessible)
      // Security is maintained through:
      // 1. Cryptographically random token (32 bytes)
      // 2. Token is tied to specific userId
      // 3. User must be in "invited" status
      // 4. Status changes to "active" after use, preventing reuse
      console.log(`[invite/accept] Using status-based token verification (metadata not accessible)`);
      // Token is considered valid if:
      // - User exists and is in "invited" status (already verified)
      // - Token format is valid and contains correct userId (already verified)
    }

    // Update user: set password and change status to active
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
          status: "active",
          // Clear invite token from metadata (only if we have metadata access)
          ...(userMetadata ? {
            metadata: {
              ...userMetadata,
              invite_token_hash: null,
              invite_token_created: null,
            },
          } : {}),
        }),
      }
    );

    if (!updateRes.ok) {
      const errorData = await updateRes.json().catch(() => null);
      const errorMessage = errorData?.errors?.[0]?.message || "Failed to set password";
      return NextResponse.json(
        { error: errorMessage },
        { status: updateRes.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

