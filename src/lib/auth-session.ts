import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export const USER_SESSION_COOKIE = "career_session";
export const STUDENT_SESSION_COOKIE = "student_session";

type SessionKind = "user" | "student";

type SessionPayload = {
  sub: string;
  kind: SessionKind;
  exp: number;
};

function sessionSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET must be configured");
  }
  return secret;
}

function signature(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(
  subject: string | number,
  kind: SessionKind,
  maxAgeSeconds: number
): string {
  const payload: SessionPayload = {
    sub: String(subject),
    kind,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifySessionToken(
  token: string | undefined,
  expectedKind: SessionKind
): SessionPayload | null {
  if (!token) return null;

  try {
    const [encoded, suppliedSignature] = token.split(".");
    if (!encoded || !suppliedSignature) return null;

    const expectedSignature = signature(encoded);
    const supplied = Buffer.from(suppliedSignature);
    const expected = Buffer.from(expectedSignature);
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as SessionPayload;
    if (
      !payload.sub ||
      payload.kind !== expectedKind ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(request: Request, maxAge: number) {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto") || "";
  const secure =
    url.protocol === "https:" ||
    forwardedProto.includes("https") ||
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
  };
}

export function expiredSessionCookieOptions(request: Request) {
  return {
    ...sessionCookieOptions(request, 0),
    expires: new Date(0),
  };
}
