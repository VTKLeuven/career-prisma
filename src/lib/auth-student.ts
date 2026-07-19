import "server-only";

import { cookies } from "next/headers";
import type { Student } from "@/lib/schema";
import {
  STUDENT_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/auth-session";
import prisma from "@/lib/prisma";

function shapeStudent(student: NonNullable<Awaited<ReturnType<typeof prisma.student.findUnique>>>): Student {
  return {
    ...student,
    id: String(student.id),
    full_name: student.full_name ?? undefined,
    university_status: student.university_status ?? undefined,
    university: student.university ?? undefined,
    organization_status: student.organization_status ?? undefined,
    in_workinggroup: student.in_workinggroup ?? undefined,
    litus_access_token: student.litus_access_token ?? undefined,
    litus_token_expires_at: student.litus_token_expires_at?.toISOString(),
    password: student.password ?? undefined,
    verified: student.verified ?? undefined,
    verification_token_hash: student.verification_token_hash ?? undefined,
    verification_token_created:
      student.verification_token_created?.toISOString(),
    date_created: student.date_created?.toISOString(),
    date_updated: student.date_updated?.toISOString(),
    is_shifter: student.is_shifter ?? undefined,
  };
}

export async function getStudentFromCookies(): Promise<Student | null> {
  const cookieStore = await cookies();
  const session = verifySessionToken(
    cookieStore.get(STUDENT_SESSION_COOKIE)?.value,
    "student"
  );
  if (!session) return null;

  const id = Number(session.sub);
  if (!Number.isSafeInteger(id)) return null;
  const student = await prisma.student.findUnique({ where: { id } });
  return student ? shapeStudent(student) : null;
}

export async function clearStudentSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(STUDENT_SESSION_COOKIE);
}
