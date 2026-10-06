"use server";

// Self-service for /student/account. Every action authorizes itself from the
// session cookie — the student id never comes from the form — and refuses the
// fields vtk.be owns for an SSO student (name, email, r-number; there is no
// password to change).

import argon2 from "argon2";
import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";
import { getStudentFromCookies } from "@/lib/auth-student";
import { STUDENT_SESSION_COOKIE } from "@/lib/auth-session";
import { SSO_HINT_COOKIE, flowCookieDomain } from "@/lib/vtk-sso";
import {
  changeStudentEmail,
  deleteStudent,
  getStudentPasswordHash,
  setStudentPasswordHash,
  updateOwnStudentDetails,
} from "@/lib/repos/students";
import { logSystemEvent } from "@/lib/repos/system-logs";

type Result = { ok: true } | { ok: false; error: string };

const SSO_OWNED = "This comes from your VTK account. Change it on vtk.be.";
const MIN_PASSWORD_LENGTH = 8; // Same as reset-password and verify.

async function checkPassword(stored: string | null | undefined, candidate: string) {
  if (!stored?.startsWith("$argon2")) return false;
  return argon2.verify(stored, candidate).catch(() => false);
}

export async function updateAccountDetailsAction(input: {
  firstName: string;
  lastName: string;
  university: string;
}): Promise<Result> {
  const student = await getStudentFromCookies();
  if (!student) return { ok: false, error: "You are not signed in." };
  if (student.sso_subject) return { ok: false, error: SSO_OWNED };

  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";
  if (!firstName || !lastName) {
    return { ok: false, error: "First and last name are required." };
  }
  if (firstName.length > 255 || lastName.length > 255 || input.university?.length > 255) {
    return { ok: false, error: "That is too long." };
  }

  const saved = await updateOwnStudentDetails(student.id, {
    firstName,
    lastName,
    university: input.university?.trim() || null,
  });
  return saved ? { ok: true } : { ok: false, error: "Could not save your details." };
}

/**
 * Changing the login address asks for the current password: with only a
 * stolen session, someone could otherwise move the account to their own inbox
 * and take it over through "forgot password".
 */
export async function changeEmailAction(input: {
  email: string;
  currentPassword: string;
}): Promise<Result> {
  const student = await getStudentFromCookies();
  if (!student) return { ok: false, error: "You are not signed in." };
  if (student.sso_subject) return { ok: false, error: SSO_OWNED };

  const email = input.email?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    return { ok: false, error: "That is not a valid email address." };
  }
  if (email === student.email) return { ok: true };
  if (!(await checkPassword(await getStudentPasswordHash(student.id), input.currentPassword ?? ""))) {
    return { ok: false, error: "Your current password is not correct." };
  }

  const result = await changeStudentEmail(student.id, email);
  if (result === "taken") {
    return { ok: false, error: "Another account already uses that address." };
  }
  if (result === "failed") return { ok: false, error: "Could not change your email." };

  await logSystemEvent({
    source: "student_accounts",
    level: "info",
    event: "email_changed",
    message: `Student ${student.id} changed their login email`,
    studentId: student.id,
  });
  return { ok: true };
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<Result> {
  const student = await getStudentFromCookies();
  if (!student) return { ok: false, error: "You are not signed in." };
  if (student.sso_subject || !student.has_password) {
    return { ok: false, error: "You sign in with your VTK account, so there is no password here." };
  }

  if (typeof input.newPassword !== "string" || input.newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Your new password needs at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (!(await checkPassword(await getStudentPasswordHash(student.id), input.currentPassword ?? ""))) {
    return { ok: false, error: "Your current password is not correct." };
  }

  const hash = await argon2.hash(input.newPassword, { type: argon2.argon2id });
  const saved = await setStudentPasswordHash(student.id, hash);
  return saved ? { ok: true } : { ok: false, error: "Could not change your password." };
}

/**
 * Deletes the student's own account and signs them out. The confirmation
 * dialog lives in the page; this is the point of no return.
 *
 * `deleteStudent()` also removes their liked companies and matching responses.
 * An SSO student who signs in with their VTK account again simply gets a new,
 * empty account.
 */
export async function deleteOwnAccountAction(): Promise<Result> {
  const student = await getStudentFromCookies();
  if (!student) return { ok: false, error: "You are not signed in." };

  try {
    await deleteStudent(Number(student.id));
  } catch (error) {
    await logSystemEvent({
      source: "student_accounts",
      level: "error",
      event: "account_delete_failed",
      message: error instanceof Error ? error.message : "Unknown error",
      studentId: student.id,
    });
    return { ok: false, error: "Could not delete your account. Please contact us." };
  }

  await logSystemEvent({
    source: "student_accounts",
    level: "info",
    event: "account_deleted",
    message: `Student ${student.id} deleted their own account`,
    studentId: student.id,
    details: { viaSso: Boolean(student.sso_subject) },
  });

  // Sign out, and drop the SSO hint so `/student-login` does not bounce them
  // straight back through vtk.be into a fresh account.
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const domain = flowCookieDomain(
    new NextRequest(`https://${host}/`, { headers: requestHeaders })
  );
  cookieStore.delete(STUDENT_SESSION_COOKIE);
  cookieStore.set(SSO_HINT_COOKIE, "", { path: "/", maxAge: 0, domain });

  return { ok: true };
}
