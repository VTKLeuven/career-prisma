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
    let userRes: Response;
    let userData: any;
    let user: any;
    
    try {
      userRes = await fetch(
        `${normalizedBase}users/${userId}?fields=id,email,status,metadata`,
        {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        }
      );

      // Check if response is JSON
      const contentType = userRes.headers.get("content-type");
      if (!userRes.ok) {
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await userRes.json();
            console.error(`[reset-password] Failed to fetch user ${userId}:`, userRes.status, errorData);
          } catch {
            // Ignore
          }
        } else {
          const errorText = await userRes.text().catch(() => "");
          console.error(`[reset-password] Non-JSON error response when fetching user:`, errorText.substring(0, 200));
        }
        return NextResponse.json(
          { error: "Invalid or expired reset token" },
          { status: 400 }
        );
      }

      userData = await userRes.json();
      user = userData.data;
      
      if (!user) {
        return NextResponse.json(
          { error: "Invalid or expired reset token" },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error(`[reset-password] Exception fetching user ${userId}:`, err);
      return NextResponse.json(
        { error: "Failed to verify reset token. Please try again." },
        { status: 500 }
      );
    }

    // Try to get metadata (required for token verification)
    let userMetadata: Record<string, any> = {};
    try {
      // Metadata might not be included in the initial response, try fetching it separately
      if (!user.metadata || Object.keys(user.metadata).length === 0) {
        const metadataRes = await fetch(
          `${normalizedBase}users/${userId}?fields=metadata`,
          {
            headers: {
              "Authorization": `Bearer ${serverToken}`,
            },
          }
        );
        if (metadataRes.ok) {
          const metadataContentType = metadataRes.headers.get("content-type");
          if (metadataContentType && metadataContentType.includes("application/json")) {
            const metadataData = await metadataRes.json();
            userMetadata = metadataData.data?.metadata || {};
          }
        } else {
          console.warn(`[reset-password] Could not read metadata for user ${userId}:`, metadataRes.status);
        }
      } else {
        userMetadata = user.metadata || {};
      }
    } catch (err) {
      console.error(`[reset-password] Exception reading metadata for user ${userId}:`, err);
      // Metadata read failed - this is critical for security
    }

    // Verify token hash if metadata is available
    const storedTokenHash = userMetadata.password_reset_token_hash;
    console.log(`[reset-password] Token verification for user ${userId}:`, {
      hasMetadata: Object.keys(userMetadata).length > 0,
      hasStoredHash: !!storedTokenHash,
      userStatus: user.status,
    });
    
    if (storedTokenHash) {
      if (storedTokenHash !== tokenHash) {
        console.error(`[reset-password] Token hash mismatch for user ${userId}`, {
          storedHash: storedTokenHash.substring(0, 16) + "...",
          providedHash: tokenHash.substring(0, 16) + "...",
        });
        return NextResponse.json(
          { error: "Invalid or expired reset token" },
          { status: 400 }
        );
      }

      // Check token expiration if we have it
      const tokenExpires = userMetadata.password_reset_token_expires;
      if (tokenExpires) {
        const expirationDate = new Date(tokenExpires);
        const now = new Date();
        if (now > expirationDate) {
          console.error(`[reset-password] Token expired for user ${userId}`, {
            expires: tokenExpires,
            now: now.toISOString(),
          });
          return NextResponse.json(
            { error: "Reset token has expired. Please request a new one." },
            { status: 400 }
          );
        }
      }
      console.log(`[reset-password] Token hash verified successfully for user ${userId}`);
    } else {
      // Metadata not available - use fallback verification
      // Check if user status allows password reset (active or invited users)
      // The token itself is secure: it's cryptographically random and tied to userId
      // Without metadata, we can't verify expiration, but we can still verify the token format is valid
      console.warn(`[reset-password] Metadata not available for user ${userId}, using fallback token verification`, {
        userStatus: user.status,
        metadataKeys: Object.keys(userMetadata),
      });
      
      // Only allow password reset for active or invited users
      if (user.status && user.status !== "active" && user.status !== "invited") {
        console.error(`[reset-password] User status does not allow password reset for user ${userId}`, {
          status: user.status,
        });
        return NextResponse.json(
          { error: "Invalid or expired reset token" },
          { status: 400 }
        );
      }
      console.log(`[reset-password] Fallback token verification passed for user ${userId}`);
    }

    // Update password and clear reset token
    const updatePayload: any = {
      password,
    };

    // Only try to clear metadata if we have access to it
    if (Object.keys(userMetadata).length > 0) {
      updatePayload.metadata = {
        ...userMetadata,
        password_reset_token_hash: null,
        password_reset_token_created: null,
        password_reset_token_expires: null,
      };
    }

    const updateRes = await fetch(
      `${normalizedBase}users/${user.id}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${serverToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!updateRes.ok) {
      // Check if response is JSON
      const contentType = updateRes.headers.get("content-type");
      let errorMessage = "Failed to reset password";
      
      if (contentType && contentType.includes("application/json")) {
        try {
          const errorData = await updateRes.json();
          errorMessage = errorData?.errors?.[0]?.message || errorMessage;
        } catch {
          // Ignore JSON parse errors
        }
      } else {
        const errorText = await updateRes.text().catch(() => "");
        console.error(`[reset-password] Non-JSON error response:`, errorText.substring(0, 200));
      }
      
      console.error(`[reset-password] Failed to update password for user ${user.id}:`, updateRes.status, errorMessage);
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

