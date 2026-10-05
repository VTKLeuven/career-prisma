// lib/repos/sessions.ts -- the lookups behind getUserFromCookies() and
// getStudentFromCookies(). Kept apart from users.ts and students.ts, which
// themselves call the session helpers (an import cycle otherwise).
import "server-only";

import prisma from "@/lib/prisma";
import { COMPANY_INCLUDE } from "@/lib/repos/_shape";

/** A user with their role and company, as the session resolver needs them. */
export async function getUserForSession(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      role: true,
      company: { include: COMPANY_INCLUDE },
    },
  });
}

/** Whether the student account sharing this email is a shifter. */
export async function isShifterStudentEmail(email: string): Promise<boolean> {
  const student = await prisma.student.findUnique({
    where: { email },
    select: { is_shifter: true },
  });
  return student?.is_shifter === true;
}

/**
 * A student for the session resolver. The password hash is loaded only so the
 * caller can tell a password account from an SSO one; it must not be passed on.
 */
export async function getStudentForSession(id: number) {
  return prisma.student.findUnique({
    where: { id },
    omit: { password: false },
  });
}
