import "server-only";

import { createHash, randomBytes } from "crypto";
import {
  findStudentByPasswordResetToken,
  findUserByPasswordResetToken,
  setStudentPasswordResetToken,
  setUserPasswordResetToken,
} from "@/lib/repos/credentials";

export const PASSWORD_RESET_MAX_AGE_MS = 60 * 60 * 1000;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createUserPasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await setUserPasswordResetToken(userId, tokenHash(token));
  return token;
}

export async function findUserForPasswordReset(token: string) {
  const user = await findUserByPasswordResetToken(tokenHash(token));
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
  await setStudentPasswordResetToken(studentId, tokenHash(token));
  return token;
}

export async function findStudentForPasswordReset(token: string) {
  const student = await findStudentByPasswordResetToken(tokenHash(token));
  if (
    !student?.password_reset_token_created ||
    Date.now() - student.password_reset_token_created.getTime() >
      PASSWORD_RESET_MAX_AGE_MS
  ) {
    return null;
  }
  return student;
}
