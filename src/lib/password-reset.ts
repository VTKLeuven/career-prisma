import "server-only";

import { createHash, randomBytes } from "crypto";
import prisma from "@/lib/prisma";

export const PASSWORD_RESET_MAX_AGE_MS = 60 * 60 * 1000;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createUserPasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await prisma.user.update({
    where: { id: userId },
    data: {
      password_reset_token: tokenHash(token),
      password_reset_token_created: new Date(),
    },
  });
  return token;
}

export async function findUserForPasswordReset(token: string) {
  const user = await prisma.user.findFirst({
    where: { password_reset_token: tokenHash(token) },
  });
  if (
    !user?.password_reset_token_created ||
    Date.now() - user.password_reset_token_created.getTime() >
      PASSWORD_RESET_MAX_AGE_MS
  ) {
    return null;
  }
  return user;
}

export async function createStudentPasswordResetToken(studentId: number) {
  const token = randomBytes(32).toString("base64url");
  await prisma.student.update({
    where: { id: studentId },
    data: {
      password_reset_token: tokenHash(token),
      password_reset_token_created: new Date(),
    },
  });
  return token;
}

export async function findStudentForPasswordReset(token: string) {
  const student = await prisma.student.findFirst({
    where: { password_reset_token: tokenHash(token) },
  });
  if (
    !student?.password_reset_token_created ||
    Date.now() - student.password_reset_token_created.getTime() >
      PASSWORD_RESET_MAX_AGE_MS
  ) {
    return null;
  }
  return student;
}
