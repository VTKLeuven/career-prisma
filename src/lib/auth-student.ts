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
    sso_subject: student.sso_subject ?? undefined,
    study_programmes: student.study_programmes ?? [],
    study_years: student.study_years ?? [],
    study_confirmed_year: student.study_confirmed_year ?? undefined,
    not_at_faculty: student.not_at_faculty ?? undefined,
    student_number: student.student_number ?? undefined,
    sso_synced_at: student.sso_synced_at?.toISOString(),
    study_self_reported: student.study_self_reported ?? false,
    sso_study_programmes: student.sso_study_programmes ?? [],
    sso_study_years: student.sso_study_years ?? [],
    sso_locale: student.sso_locale ?? undefined,
    preferred_language: student.preferred_language ?? undefined,
    sso_access_token: student.sso_access_token ?? undefined,
    sso_token_expires_at: student.sso_token_expires_at?.toISOString(),
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
