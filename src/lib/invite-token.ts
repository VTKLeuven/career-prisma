/**
 * Generate invite token for a user - server-only version (no auth cookie required).
 * Used by API routes (e.g. password request for invited users) where we only have server token.
 * Stores token hash in user metadata for validation by /api/invite/validate and /api/invite/accept.
 */
export async function generateInviteTokenServer(
  userId: string
): Promise<{ token: string; email: string } | null> {
  const baseUrl = process.env.DIRECTUS_URL;
  const serverToken = process.env.DIRECTUS_SERVER_TOKEN;

  if (!baseUrl) {
    console.error("[generateInviteTokenServer] DIRECTUS_URL not configured");
    return null;
  }

  if (!serverToken) {
    console.error("[generateInviteTokenServer] DIRECTUS_SERVER_TOKEN not configured");
    return null;
  }

  const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

  try {
    let userRes = await fetch(
      `${normalizedBase}users/${userId}?fields=id,email,status,metadata`,
      {
        headers: {
          Authorization: `Bearer ${serverToken}`,
        },
      }
    );

    if (userRes.status === 403) {
      userRes = await fetch(
        `${normalizedBase}users/${userId}?fields=id,email,status`,
        {
          headers: {
            Authorization: `Bearer ${serverToken}`,
          },
        }
      );
    }

    if (!userRes.ok) {
      const errorText = await userRes.text().catch(() => "Unknown error");
      console.error(
        `[generateInviteTokenServer] Failed to fetch user ${userId}:`,
        userRes.status,
        errorText
      );
      return null;
    }

    const userData = await userRes.json();
    const user = userData.data;

    if (!user) {
      console.error(`[generateInviteTokenServer] User ${userId} not found in response`);
      return null;
    }

    if (!user.email) {
      console.error(`[generateInviteTokenServer] User ${userId} has no email`);
      return null;
    }

    const crypto = await import("crypto");
    const randomToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto
      .createHash("sha256")
      .update(randomToken)
      .digest("hex");

    const inviteToken = Buffer.from(`${user.id}:${randomToken}`).toString("base64url");

    const userMetadata = user.metadata || {};
    const metadataUpdate = {
      ...userMetadata,
      invite_token_hash: tokenHash,
      invite_token_created: new Date().toISOString(),
    };

    try {
      const updateRes = await fetch(`${normalizedBase}users/${user.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${serverToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metadata: metadataUpdate,
        }),
      });

      if (updateRes.ok) {
        console.log(
          `[generateInviteTokenServer] Successfully stored invite token for user ${userId}`
        );
      } else {
        const errorData = await updateRes.json().catch(() => null);
        const errorMessage =
          errorData?.errors?.[0]?.message || (await updateRes.text().catch(() => "Unknown error"));
        console.warn(
          `[generateInviteTokenServer] Metadata write failed (${updateRes.status}): ${errorMessage} - invite/accept may use status-based verification`
        );
      }
    } catch (err) {
      console.warn(`[generateInviteTokenServer] Exception writing metadata:`, err);
    }

    return {
      token: inviteToken,
      email: user.email,
    };
  } catch (err) {
    console.error("[generateInviteTokenServer] Exception during token generation:", err);
    if (err instanceof Error) {
      console.error("[generateInviteTokenServer] Error stack:", err.stack);
    }
    return null;
  }
}
