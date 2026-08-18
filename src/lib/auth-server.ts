import "server-only";

import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { AppUser } from "@/lib/schema";
import {
  USER_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/auth-session";
import prisma from "@/lib/prisma";
import { COMPANY_INCLUDE, shapeCompany } from "@/lib/repos/_shape";

// The two internal roles. Their names read backwards from what you would guess,
// so always match on the id: "VTK Career" is the sales role, and "Administrator"
// is the support role. Both grant the same permissions; the difference is only
// that lib/repos/users.ts builds the salesperson lists from the VTK Career id,
// which is what keeps an Administrator off company records and off the public
// homepage. Kept in sync with ALLOWED_ROLE_IDS in api/login/route.ts.
const VTK_CAREER_ROLE_ID = "7b128ef4-f530-47d2-8f4c-ef82518eb313";
const ADMINISTRATOR_ROLE_ID = "c4e63615-ed81-45d1-8145-1b88137e60cb";
type CookieToSet = { name: string; value: string; options: Record<string, unknown> };

async function getUserById(userId: string): Promise<AppUser | undefined> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      company: { include: COMPANY_INCLUDE },
    },
  });
  if (!user || user.status !== "active" || !user.email || !user.role) {
    return undefined;
  }

  const student = await prisma.student.findUnique({
    where: { email: user.email },
    select: { is_shifter: true },
  });

  return {
    id: user.id,
    name:
      [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email,
    email: user.email,
    tel: user.tel ?? "not set",
    title: user.title ?? undefined,
    role: user.role.name,
    admin:
      user.role.name === "Administrator" ||
      user.role.id === VTK_CAREER_ROLE_ID ||
      user.role.id === ADMINISTRATOR_ROLE_ID,
    company: user.company ? shapeCompany(user.company) : null,
    status: user.status,
    is_shifter: student?.is_shifter === true,
  };
}

export async function getUserFromCookies(): Promise<AppUser | undefined> {
  const cookieStore = await cookies();
  const session = verifySessionToken(
    cookieStore.get(USER_SESSION_COOKIE)?.value,
    "user"
  );
  return session ? getUserById(session.sub) : undefined;
}

export async function requireAdminUser() {
  const user = await getUserFromCookies();
  if (!user?.admin) throw new Error("Unauthorized");
  return user;
}

/**
 * Kept for route-call compatibility. Sessions no longer need refresh tokens:
 * the signed cookie carries its expiry and the account is resolved from
 * PostgreSQL on every request.
 */
export async function getUserFromRequestWithRefresh(
  _request: NextRequest
): Promise<{ user: AppUser | undefined; cookiesToSet: CookieToSet[] }> {
  return { user: await getUserFromCookies(), cookiesToSet: [] };
}
