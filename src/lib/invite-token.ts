import "server-only";

import { createHash, randomBytes } from "crypto";
import { findUserWithInvite, setUserInviteToken } from "@/lib/repos/credentials";

export const INVITE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function decodeInviteToken(token: string) {
  try {
    const [userId, rawToken] = Buffer.from(token, "base64url")
      .toString("utf8")
      .split(":");
    // User ids are UUIDs; anything else is a mangled link, not a lookup
    // (Postgres would reject it with an error).
    if (!userId || !rawToken || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return null;
    return {
      userId,
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
    };
  } catch {
    return null;
  }
}

export async function validateInviteToken(token: string) {
  const decoded = decodeInviteToken(token);
  if (!decoded) return null;
  const user = await findUserWithInvite(decoded.userId);
  if (
    !user ||
    user.status !== "invited" ||
    user.invite_token_hash !== decoded.tokenHash ||
    !user.invite_token_created ||
    Date.now() - user.invite_token_created.getTime() > INVITE_MAX_AGE_MS
  ) {
    return null;
  }
  // The token material has done its job; callers only need who and where.
  const { invite_token_hash: _hash, invite_token_created: _created, ...invitedUser } = user;
  return invitedUser;
}

export async function generateInviteTokenServer(
  userId: string
): Promise<{ token: string; email: string } | null> {
  const rawToken = randomBytes(32).toString("base64url");
  const email = await setUserInviteToken(
    userId,
    createHash("sha256").update(rawToken).digest("hex")
  );
  if (!email) return null;
  return {
    token: Buffer.from(`${userId}:${rawToken}`).toString("base64url"),
    email,
  };
}
