"use server";

import { randomBytes, createHash } from "crypto";
import type { Student } from "@/lib/schema";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type StudentRow = Awaited<ReturnType<typeof prisma.student.findUnique>>;

function shapeStudent(row: NonNullable<StudentRow>): Student {
  return {
    ...row,
    id: String(row.id),
    full_name: row.full_name ?? undefined,
    university_status: row.university_status ?? undefined,
    university: row.university ?? undefined,
    organization_status: row.organization_status ?? undefined,
    in_workinggroup: row.in_workinggroup ?? undefined,
    sso_subject: row.sso_subject ?? undefined,
    study_programmes: row.study_programmes ?? [],
    study_years: row.study_years ?? [],
    study_confirmed_year: row.study_confirmed_year ?? undefined,
    not_at_faculty: row.not_at_faculty ?? undefined,
    student_number: row.student_number ?? undefined,
    sso_synced_at: row.sso_synced_at?.toISOString(),
    study_self_reported: row.study_self_reported ?? false,
    sso_study_programmes: row.sso_study_programmes ?? [],
    sso_study_years: row.sso_study_years ?? [],
    sso_locale: row.sso_locale ?? undefined,
    preferred_language: row.preferred_language ?? undefined,
    sso_access_token: row.sso_access_token ?? undefined,
    sso_token_expires_at: row.sso_token_expires_at?.toISOString(),
    password: row.password ?? undefined,
    verified: row.verified ?? undefined,
    verification_token_hash: row.verification_token_hash ?? undefined,
    verification_token_created: row.verification_token_created?.toISOString(),
    date_created: row.date_created?.toISOString(),
    date_updated: row.date_updated?.toISOString(),
    is_shifter: row.is_shifter ?? undefined,
  };
}

export async function findStudentByEmail(email: string): Promise<Student | null> {
  const row = await prisma.student.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  return row ? shapeStudent(row) : null;
}

/* ------------------------------------------------------------------ *
 * Admin student management
 * ------------------------------------------------------------------ */

export async function listStudents(opts?: { limit?: number }): Promise<Student[]> {
  const rows = await prisma.student.findMany({
    orderBy: [{ first_name: "asc" }, { last_name: "asc" }],
    take: opts?.limit ?? 2000,
  });
  return rows.map(shapeStudent);
}

function toStudentWrite(payload: Record<string, any>): Record<string, unknown> {
  // Typed rather than Record<string, unknown>: the create below needs a real
  // Prisma input type, and casting one in would switch off exactly the check
  // that catches a column renamed out from under this function.
  const data: Prisma.StudentUpdateInput = {};
  const passthrough = ["first_name", "last_name", "full_name", "university"] as const;
  for (const key of passthrough) {
    if (payload[key] !== undefined) data[key] = payload[key] || null;
  }
  if (payload.email !== undefined) data.email = String(payload.email).trim().toLowerCase();
  if (payload.username !== undefined) data.username = String(payload.username).trim();
  if (payload.verified !== undefined) data.verified = Boolean(payload.verified);
  if (payload.is_shifter !== undefined) data.is_shifter = Boolean(payload.is_shifter);
  return data;
}

export async function updateStudent(id: number, payload: Record<string, any>): Promise<Student> {
  const row = await prisma.student.update({
    where: { id },
    data: { ...toStudentWrite(payload), date_updated: new Date() },
  });
  return shapeStudent(row);
}

/** Removes the student and all of their matching/company associations. */
export async function deleteStudent(id: number): Promise<void> {
  await prisma.$transaction([
    prisma.studentMatchingResponseCompany.deleteMany({
      where: { studentMatchingResponse: { student_id: id } },
    }),
    prisma.studentMatchingResponse.deleteMany({ where: { student_id: id } }),
    prisma.companyMatchingResponseStudent.deleteMany({ where: { students_id: id } }),
    prisma.studentCompany.deleteMany({ where: { students_id: id } }),
    prisma.student.delete({ where: { id } }),
  ]);
}

/** Looks a student up by their SSO subject (the OIDC `sub`). */
export async function findStudentBySsoSubject(
  subject: string
): Promise<Student | null> {
  const row = await prisma.student.findUnique({ where: { sso_subject: subject } });
  return row ? shapeStudent(row) : null;
}

/** What the SSO flow hands over. Mirrors `SsoProfile` in `lib/vtk-sso-claims.ts`. */
export interface SsoStudentUpsert {
  subject: string;
  email: string;
  username: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  studentNumber?: string;
  studyProgrammes?: string[];
  studyYears?: string[];
  studyConfirmedYear?: number;
  notAtFaculty?: boolean;
  locale?: string;
  accessToken?: string;
  expiresIn?: number;
}

/**
 * Finds the row this SSO identity belongs to, in descending order of how much
 * the match is worth trusting:
 *
 * 1. `sso_subject` — they have signed in through the new SSO before.
 * 2. `student_number` — the r-number, for a row an earlier SSO login (or an
 *    admin) filled in without a subject.
 * 3. `username` equal to the r-number — the LITUS migration. The old login
 *    stored the LITUS username and never filled `student_number`, which is a
 *    newer column; LITUS usernames are r-numbers. Case-insensitive, because
 *    neither side guarantees the case.
 * 4. `email` — for students without an r-number at all.
 *
 * `preferred_username` is deliberately not a match key: vtk.be derives it from
 * the email's local part, so it is neither unique nor the LITUS username.
 *
 * Rows that already carry a *different* subject are never adopted — that would
 * hand this student someone else's account. A match through 2-4 stamps
 * `sso_subject` on the row, so every later login takes path 1.
 */
async function findExistingStudentRow(profile: SsoStudentUpsert) {
  const bySubject = await prisma.student.findUnique({
    where: { sso_subject: profile.subject },
  });
  if (bySubject) return { row: bySubject, matchedBy: "subject" as const };

  if (profile.studentNumber) {
    // Neither column is unique — a duplicate means two rows for one person.
    // Take the oldest and leave the duplicate visible rather than failing a
    // login over it.
    const byNumber = await prisma.student.findFirst({
      where: {
        student_number: { equals: profile.studentNumber, mode: "insensitive" },
        sso_subject: null,
      },
      orderBy: { id: "asc" },
    });
    if (byNumber) return { row: byNumber, matchedBy: "student_number" as const };

    const byLegacyUsername = await prisma.student.findFirst({
      where: {
        username: { equals: profile.studentNumber, mode: "insensitive" },
        sso_subject: null,
      },
      orderBy: { id: "asc" },
    });
    if (byLegacyUsername) {
      return { row: byLegacyUsername, matchedBy: "legacy_username" as const };
    }
  }

  const byEmail = await prisma.student.findUnique({
    where: { email: profile.email.trim().toLowerCase() },
  });
  return byEmail && !byEmail.sso_subject
    ? { row: byEmail, matchedBy: "email" as const }
    : null;
}

/**
 * How the SSO identity was tied to a row — "created" when none matched. Logged
 * on every login, because during the LITUS migration it is the answer to "why
 * did this student end up with a second account?".
 */
export type SsoStudentMatch =
  | "subject"
  | "student_number"
  | "legacy_username"
  | "email"
  | "created";

/** vtk.be sends "nl-BE" or "en"; Career stores the bare language. */
function languageFromLocale(locale: string | undefined): "nl" | "en" | undefined {
  const language = locale?.toLowerCase().split("-")[0];
  return language === "nl" || language === "en" ? language : undefined;
}

/** Splits a full name the way the LITUS flow did: first word, then the rest. */
function splitName(fullName: string): { first: string | null; last: string | null } {
  const parts = fullName.trim().split(/\s+/);
  return {
    first: parts[0] || null,
    last: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

/**
 * Creates or refreshes a student from SSO claims. Called on every completed
 * login flow, which is what keeps study programme and year current — there is
 * no background refresh, by design (`docs/auth.md`).
 */
export async function upsertStudentFromSso(
  profile: SsoStudentUpsert
): Promise<{ student: Student; matchedBy: SsoStudentMatch } | null> {
  const email = profile.email.trim().toLowerCase();

  const data: Record<string, unknown> = {
    sso_subject: profile.subject,
    sso_synced_at: new Date(),
    date_updated: new Date(),
    university: "KU Leuven",
    email,
    sso_access_token: profile.accessToken ?? null,
    sso_token_expires_at: profile.accessToken
      ? new Date(Date.now() + (profile.expiresIn || 3600) * 1000)
      : null,
  };

  // A claim the SSO did not send is absent, never null, and absent means "not
  // granted or not known" — so leave what we already had rather than blanking
  // the column on a student who declined a scope.
  if (profile.studentNumber !== undefined) data.student_number = profile.studentNumber;
  if (profile.notAtFaculty !== undefined) data.not_at_faculty = profile.notAtFaculty;
  if (profile.studyConfirmedYear !== undefined) {
    data.study_confirmed_year = profile.studyConfirmedYear;
  }

  // What vtk.be sent, verbatim — empty arrays included. The account page shows
  // it, which is how a student (or we) can check the claims arrive at all.
  if (profile.studyProgrammes !== undefined) data.sso_study_programmes = profile.studyProgrammes;
  if (profile.studyYears !== undefined) data.sso_study_years = profile.studyYears;
  if (profile.locale !== undefined) data.sso_locale = profile.locale;

  const names = profile.fullName ? splitName(profile.fullName) : null;
  const firstName = profile.firstName ?? names?.first ?? undefined;
  const lastName = profile.lastName ?? names?.last ?? undefined;
  if (profile.fullName) data.full_name = profile.fullName;
  if (firstName) data.first_name = firstName;
  if (lastName) data.last_name = lastName;

  try {
    const existing = await findExistingStudentRow(profile);

    // Study info: vtk.be is the source of truth for an SSO student and wins
    // whenever it has something to say. Two ways it does not:
    // - An empty claim never overwrites. Members outside FIRW, alumni and
    //   staff arrive with `[]` and fill the answer in on Career instead.
    // - A member who told vtk.be they are not at the faculty may choose their
    //   programme on Career (`/student/account`), and that choice survives
    //   their next login even if vtk.be has programmes on file for them.
    const keepCareerProgrammes =
      profile.notAtFaculty === true && existing?.row.study_self_reported === true;
    if (profile.studyProgrammes?.length && !keepCareerProgrammes) {
      data.study_programmes = profile.studyProgrammes;
      data.study_self_reported = false;
    }
    if (profile.studyYears?.length) data.study_years = profile.studyYears;

    // The language is Career's own preference; vtk.be's `locale` only seeds it
    // until the student picks one.
    const language = languageFromLocale(profile.locale);
    if (language && !existing?.row.preferred_language) data.preferred_language = language;

    if (existing) {
      return {
        student: shapeStudent(
          await prisma.student.update({ where: { id: existing.row.id }, data })
        ),
        matchedBy: existing.matchedBy,
      };
    }

    const created = shapeStudent(
      await prisma.student.create({
        data: {
          ...data,
          username: profile.username.trim(),
          email,
          university_status: "student",
          in_workinggroup: false,
          date_created: new Date(),
          // SSO students are verified by definition — VTK vouched for the
          // address. Only password registrations need email verification.
          verified: true,
        },
      })
    );
    return { student: created, matchedBy: "created" };
  } catch (error) {
    console.error("[upsertStudentFromSso] Failed:", error);
    return null;
  }
}

/**
 * Stores study info a student chose on Career — during onboarding, or on
 * `/student/account`. Either list may be left out, which leaves that column as
 * it is: the caller (`app/actions/student-study.ts`) only passes the fields
 * this student is allowed to change (`studyEditability()`).
 */
export async function saveSelfReportedStudy(
  studentId: string,
  study: { programmes?: string[]; years?: string[] }
): Promise<Student | null> {
  const id = Number(studentId);
  if (!Number.isSafeInteger(id)) return null;

  try {
    const row = await prisma.student.update({
      where: { id },
      data: {
        ...(study.programmes ? { study_programmes: study.programmes } : {}),
        ...(study.years ? { study_years: study.years } : {}),
        study_self_reported: true,
        date_updated: new Date(),
      },
    });
    return shapeStudent(row);
  } catch (error) {
    console.error("[saveSelfReportedStudy] Failed:", error);
    return null;
  }
}

/** Stores the student's preferred language ("nl" or "en"). */
export async function saveStudentLanguage(
  studentId: string,
  language: "nl" | "en"
): Promise<boolean> {
  const id = Number(studentId);
  if (!Number.isSafeInteger(id)) return false;

  try {
    await prisma.student.update({
      where: { id },
      data: { preferred_language: language, date_updated: new Date() },
    });
    return true;
  } catch (error) {
    console.error("[saveStudentLanguage] Failed:", error);
    return false;
  }
}

/**
 * The details a password ("external") student may edit on /student/account.
 * SSO students never reach this: vtk.be owns their name and email, and the
 * action refuses before calling it.
 */
export async function updateOwnStudentDetails(
  studentId: string,
  details: { firstName: string; lastName: string; university: string | null }
): Promise<Student | null> {
  const id = Number(studentId);
  if (!Number.isSafeInteger(id)) return null;

  try {
    const row = await prisma.student.update({
      where: { id },
      data: {
        first_name: details.firstName,
        last_name: details.lastName,
        full_name: `${details.firstName} ${details.lastName}`,
        university: details.university,
        date_updated: new Date(),
      },
    });
    return shapeStudent(row);
  } catch (error) {
    console.error("[updateOwnStudentDetails] Failed:", error);
    return null;
  }
}

/**
 * Changes a password student's login email. Returns "taken" rather than
 * throwing on the unique constraint, so the form can say so.
 */
export async function changeStudentEmail(
  studentId: string,
  email: string
): Promise<"ok" | "taken" | "failed"> {
  const id = Number(studentId);
  if (!Number.isSafeInteger(id)) return "failed";
  const normalized = email.trim().toLowerCase();

  const owner = await prisma.student.findUnique({
    where: { email: normalized },
    select: { id: true },
  });
  if (owner && owner.id !== id) return "taken";

  try {
    await prisma.student.update({
      where: { id },
      data: { email: normalized, date_updated: new Date() },
    });
    return "ok";
  } catch (error) {
    console.error("[changeStudentEmail] Failed:", error);
    return "failed";
  }
}

/** Stores a new password hash. The caller hashes and checks the old one. */
export async function setStudentPasswordHash(
  studentId: string,
  passwordHash: string
): Promise<boolean> {
  const id = Number(studentId);
  if (!Number.isSafeInteger(id)) return false;

  try {
    await prisma.student.update({
      where: { id },
      data: {
        password: passwordHash,
        // A reset link in someone's inbox must not outlive the password it
        // was meant to replace.
        password_reset_token: null,
        password_reset_token_created: null,
        date_updated: new Date(),
      },
    });
    return true;
  } catch (error) {
    console.error("[setStudentPasswordHash] Failed:", error);
    return false;
  }
}

export async function generateStudentVerificationToken(
  studentId: string
): Promise<{ token: string; email: string } | null> {
  const id = Number(studentId);
  if (!Number.isSafeInteger(id)) return null;

  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return null;

  const randomToken = randomBytes(32).toString("base64url");
  await prisma.student.update({
    where: { id },
    data: {
      verification_token_hash: createHash("sha256")
        .update(randomToken)
        .digest("hex"),
      verification_token_created: new Date(),
      verified: false,
    },
  });

  return {
    token: Buffer.from(`${id}:${randomToken}`).toString("base64url"),
    email: student.email,
  };
}

export async function createNonOAuthStudent(studentData: {
  username: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string;
  university_status?: string | null;
  university?: string | null;
  in_workinggroup?: boolean;
}): Promise<Student | null> {
  try {
    const row = await prisma.student.create({
      data: {
        username: studentData.username.trim(),
        email: studentData.email.trim().toLowerCase(),
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        full_name:
          studentData.full_name ||
          `${studentData.first_name} ${studentData.last_name}`,
        university_status: studentData.university_status || null,
        university: studentData.university || null,
        in_workinggroup: studentData.in_workinggroup ?? false,
        verified: false,
        date_created: new Date(),
        date_updated: new Date(),
      },
    });
    return shapeStudent(row);
  } catch (error) {
    console.error("[createNonOAuthStudent] Failed:", error);
    return null;
  }
}
