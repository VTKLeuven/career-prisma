"use server";

import { randomBytes, createHash } from "crypto";
import type { Student } from "@/lib/schema";
import prisma from "@/lib/prisma";

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
    litus_access_token: row.litus_access_token ?? undefined,
    litus_token_expires_at: row.litus_token_expires_at?.toISOString(),
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

export async function findStudentByUsername(
  username: string
): Promise<Student | null> {
  const row = await prisma.student.findUnique({
    where: { username: username.trim() },
  });
  return row ? shapeStudent(row) : null;
}

export async function createStudentFromOAuth(
  oauthData: {
    username: string;
    full_name?: string;
    email: string;
    university_status?: string;
    university?: string;
    organization_status?: string;
    in_workinggroup?: boolean;
  },
  tokenData: { access_token: string; expires_in?: number }
): Promise<Student | null> {
  const nameParts = oauthData.full_name?.trim().split(/\s+/) || [];
  try {
    const row = await prisma.student.create({
      data: {
        username: oauthData.username.trim(),
        email: oauthData.email.trim().toLowerCase(),
        first_name: nameParts[0] || null,
        last_name: nameParts.length > 1 ? nameParts.slice(1).join(" ") : null,
        full_name: oauthData.full_name || null,
        university_status: oauthData.university_status || null,
        university: oauthData.university || "KU Leuven",
        organization_status: oauthData.organization_status || null,
        in_workinggroup: oauthData.in_workinggroup ?? false,
        litus_access_token: tokenData.access_token,
        litus_token_expires_at: new Date(
          Date.now() + (tokenData.expires_in || 3600) * 1000
        ),
        date_created: new Date(),
        date_updated: new Date(),
        verified: true,
      },
    });
    return shapeStudent(row);
  } catch (error) {
    console.error("[createStudentFromOAuth] Failed:", error);
    return null;
  }
}

export async function updateStudentOAuthToken(
  studentId: string,
  tokenData: { access_token: string; expires_in?: number }
): Promise<Student | null> {
  const id = Number(studentId);
  if (!Number.isSafeInteger(id)) return null;
  try {
    const row = await prisma.student.update({
      where: { id },
      data: {
        litus_access_token: tokenData.access_token,
        litus_token_expires_at: new Date(
          Date.now() + (tokenData.expires_in || 3600) * 1000
        ),
        date_updated: new Date(),
      },
    });
    return shapeStudent(row);
  } catch {
    return null;
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

export async function updateStudentOAuthData(
  studentId: string,
  oauthData: {
    full_name?: string;
    email?: string;
    university_status?: string;
    university?: string;
    organization_status?: string;
    in_workinggroup?: boolean;
  }
): Promise<Student | null> {
  const id = Number(studentId);
  if (!Number.isSafeInteger(id)) return null;

  const data: Record<string, unknown> = { date_updated: new Date() };
  if (oauthData.full_name) {
    const nameParts = oauthData.full_name.trim().split(/\s+/);
    data.first_name = nameParts[0] || null;
    data.last_name =
      nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
    data.full_name = oauthData.full_name;
  }
  if (oauthData.email) data.email = oauthData.email.trim().toLowerCase();
  if (oauthData.university_status !== undefined)
    data.university_status = oauthData.university_status;
  data.university = oauthData.university ?? "KU Leuven";
  if (oauthData.organization_status !== undefined)
    data.organization_status = oauthData.organization_status;
  if (oauthData.in_workinggroup !== undefined)
    data.in_workinggroup = oauthData.in_workinggroup;

  try {
    const row = await prisma.student.update({
      where: { id },
      data,
    });
    return shapeStudent(row);
  } catch (error) {
    console.error("[updateStudentOAuthData] Failed:", error);
    return null;
  }
}
