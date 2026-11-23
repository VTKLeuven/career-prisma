// lib/repos/credentials.ts -- every query that reads or writes a password
// hash or a single-use token (password reset, invite, email verification).
//
// The client-wide omit in lib/prisma.ts keeps these columns out of every other
// query; this is the one module that opts back in, so it is the place to look
// when reviewing how credentials are handled.
import "server-only";

import prisma from "@/lib/prisma";
import { ROLE_COMPANY_REP } from "@/lib/roles";

/* --------------------------------- users --------------------------------- */

/** A user with their password hash, for the login check. */
export async function findUserCredentials(email: string) {
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    omit: { password: false },
  });
}

export async function recordUserLogin(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { last_access: new Date() } });
}

export async function setUserPasswordResetToken(userId: string, tokenHash: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { password_reset_token: tokenHash, password_reset_token_created: new Date() },
  });
}

/** The user holding a reset token, with when it was issued. */
export async function findUserByPasswordResetToken(tokenHash: string) {
  return prisma.user.findFirst({
    where: { password_reset_token: tokenHash },
    omit: { password_reset_token_created: false },
  });
}

/** Sets a new password from a reset link: clears the token and activates the account. */
export async function resetUserPassword(userId: string, passwordHash: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: passwordHash,
      password_reset_token: null,
      password_reset_token_created: null,
      status: "active",
    },
  });
}

/** Issues an invite: stores the token's hash and marks the account invited. Returns the email. */
export async function setUserInviteToken(userId: string, tokenHash: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user?.email) return null;
  await prisma.user.update({
    where: { id: userId },
    data: { invite_token_hash: tokenHash, invite_token_created: new Date(), status: "invited" },
  });
  return user.email;
}

/** A user with their invite token material and company, for validating an invite. */
export async function findUserWithInvite(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
    omit: { invite_token_hash: false, invite_token_created: false },
  });
}

/** Accepting an invite: sets the password, activates, and burns the token. */
export async function acceptUserInvite(userId: string, passwordHash: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: passwordHash,
      status: "active",
      invite_token_hash: null,
      invite_token_created: null,
    },
  });
}

/** An admin sets the password directly: activates the account, no invite needed. */
export async function setUserPassword(userId: string, passwordHash: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: passwordHash,
      status: "active",
      invite_token_hash: null,
      invite_token_created: null,
    },
  });
}

/** One account in a bulk import of company representatives. */
export type RepAccountWrite =
  | {
      kind: "create";
      email: string;
      companyId: string;
      passwordHash: string;
      firstName: string | null;
      lastName: string | null;
    }
  | {
      kind: "update";
      userId: string;
      companyId: string;
      passwordHash: string;
      /** Undefined leaves the stored name alone. */
      firstName?: string;
      lastName?: string;
    };

/**
 * Writes a bulk import of representative accounts, all or nothing: a new
 * account is created active with its password, an existing one gets the new
 * password, is activated and (re)attached to the company. Like
 * setUserPassword(), any outstanding invite is burned -- the admin has chosen
 * the password, so the invite link must not override it later.
 */
export async function writeRepAccounts(writes: RepAccountWrite[]): Promise<void> {
  await prisma.$transaction(
    writes.map((w) =>
      w.kind === "create"
        ? prisma.user.create({
            data: {
              email: w.email.trim().toLowerCase(),
              role_id: ROLE_COMPANY_REP,
              status: "active",
              password: w.passwordHash,
              company_id: w.companyId,
              first_name: w.firstName,
              last_name: w.lastName,
            },
            select: { id: true },
          })
        : prisma.user.update({
            where: { id: w.userId },
            data: {
              password: w.passwordHash,
              status: "active",
              invite_token_hash: null,
              invite_token_created: null,
              company_id: w.companyId,
              ...(w.firstName !== undefined ? { first_name: w.firstName } : {}),
              ...(w.lastName !== undefined ? { last_name: w.lastName } : {}),
            },
            select: { id: true },
          })
    )
  );
}

/* -------------------------------- students -------------------------------- */

/** A student with their password hash, for the login check. */
export async function findStudentCredentials(email: string) {
  return prisma.student.findUnique({
    where: { email: email.trim().toLowerCase() },
    omit: { password: false },
  });
}

export async function setStudentPasswordResetToken(studentId: number, tokenHash: string): Promise<void> {
  await prisma.student.update({
    where: { id: studentId },
    data: { password_reset_token: tokenHash, password_reset_token_created: new Date() },
  });
}

/** The student holding a reset token, with when it was issued. */
export async function findStudentByPasswordResetToken(tokenHash: string) {
  return prisma.student.findFirst({
    where: { password_reset_token: tokenHash },
    omit: { password_reset_token_created: false },
  });
}

export async function resetStudentPassword(studentId: number, passwordHash: string): Promise<void> {
  await prisma.student.update({
    where: { id: studentId },
    data: {
      password: passwordHash,
      password_reset_token: null,
      password_reset_token_created: null,
      date_updated: new Date(),
    },
  });
}

/** A student with their email-verification token material. */
export async function findStudentForVerification(studentId: number) {
  return prisma.student.findUnique({
    where: { id: studentId },
    omit: { verification_token_hash: false, verification_token_created: false },
  });
}

/** Completes registration: sets the password, marks verified and burns the token. */
export async function verifyStudent(studentId: number, passwordHash: string): Promise<void> {
  await prisma.student.update({
    where: { id: studentId },
    data: {
      password: passwordHash,
      verified: true,
      verification_token_hash: null,
      verification_token_created: null,
      date_updated: new Date(),
    },
  });
}
