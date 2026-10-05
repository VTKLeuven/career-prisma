import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import type { Student } from "@/lib/schema";
import {
  STUDENT_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/auth-session";
import prisma from "@/lib/prisma";

type StudentRowWithPassword = NonNullable<Awaited<ReturnType<typeof prisma.student.findUnique>>> & {
  password: string | null;
};

function shapeStudent(row: StudentRowWithPassword): Student {
  const { password: _password, ...student } = row;
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
    has_password: Boolean(row.password),
    verified: student.verified ?? undefined,
    date_created: student.date_created?.toISOString(),
    date_updated: student.date_updated?.toISOString(),
    is_shifter: student.is_shifter ?? undefined,
  };
}

/** The signed-in student. Memoised per request, like getUserFromCookies. */
export const getStudentFromCookies = cache(async (): Promise<Student | null> => {
  const cookieStore = await cookies();
  const session = verifySessionToken(
    cookieStore.get(STUDENT_SESSION_COOKIE)?.value,
    "student"
  );
  if (!session) return null;

  const id = Number(session.sub);
  if (!Number.isSafeInteger(id)) return null;
  // The hash is loaded only to set `has_password`; the shape never carries it.
  const student = await prisma.student.findUnique({
    where: { id },
    omit: { password: false },
  });
  return student ? shapeStudent(student) : null;
});

export async function clearStudentSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(STUDENT_SESSION_COOKIE);
}
