import "server-only";

import { createHash, randomBytes } from "crypto";
import prisma from "@/lib/prisma";

export const INVITE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function decodeInviteToken(token: string) {
  try {
    const [userId, rawToken] = Buffer.from(token, "base64url")
      .toString("utf8")
      .split(":");
    if (!userId || !rawToken) return null;
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
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { company: true },
  });
  if (
    !user ||
    user.status !== "invited" ||
    user.invite_token_hash !== decoded.tokenHash ||
    !user.invite_token_created ||
    Date.now() - user.invite_token_created.getTime() > INVITE_MAX_AGE_MS
  ) {
    return null;
  }
  return user;
}

export async function generateInviteTokenServer(
  userId: string
): Promise<{ token: string; email: string } | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email) return null;
  const rawToken = randomBytes(32).toString("base64url");
  await prisma.user.update({
    where: { id: userId },
    data: {
      invite_token_hash: createHash("sha256")
        .update(rawToken)
        .digest("hex"),
      invite_token_created: new Date(),
      status: "invited",
    },
  });
  return {
    token: Buffer.from(`${userId}:${rawToken}`).toString("base64url"),
    email: user.email,
  };
}
