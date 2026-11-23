"use server";

import { revalidatePath } from "next/cache";
import argon2 from "argon2";
import { requireAdminUser } from "@/lib/auth-server";
import {
  createUser,
  updateUser,
  deleteUser,
  getAdminUser,
  type AdminUserRow,
} from "@/lib/repos/users";
import { setUserPassword } from "@/lib/repos/credentials";
import { logSystemEvent } from "@/lib/repos/system-logs";
import {
  applyRepAccountImport,
  previewRepAccountImport,
  MAX_IMPORT_BYTES,
  MIN_PASSWORD_LENGTH,
  type CompanyChoices,
  type ImportChoices,
  type RepImportPlan,
  type RepImportRow,
} from "@/lib/rep-account-import";
// Every write below can change the homepage team section -- a new salesperson,
// an edited name, photo or card link, an archived account, or an invite that
// flips the status back to `invited` and drops them from the list. Without this
// the change stays invisible for up to the cache TTL and reads as a failed save.
import { invalidateHomepageCache } from "@/lib/homepage-cache";
import type { ActionResult } from "@/components/admin/types";

/** One user for the User Management form (the company page edits reps with it). */
export async function fetchAdminUserAction(id: string): Promise<AdminUserRow | null> {
  await requireAdminUser();
  return getAdminUser(id);
}

/**
 * Splits the form's "Set password" field off the user payload. Empty means
 * "leave the password alone"; anything else must be a usable password, and is
 * checked before anything is written so a too-short one does not leave the
 * rest of the edit half saved.
 */
function takeNewPassword(data: Record<string, unknown>): {
  password: string | null;
  rest: Record<string, unknown>;
} {
  const { new_password, ...rest } = data;
  const password = typeof new_password === "string" && new_password.length > 0 ? new_password : null;
  if (password === null) return { password, rest };
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`The password needs at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  // Setting a password activates the account (setUserPassword), which would
  // silently undo an archive made in the same save.
  if (rest.status === "archived") {
    throw new Error("An archived account cannot sign in; set it to Active to give it a password");
  }
  return { password, rest };
}

/**
 * An admin sets a user's password, with no mail and no reset link -- for
 * accounts whose address is not a real inbox, such as the shared scanning
 * accounts companies use at an event. Existing sessions stay signed in.
 */
async function applyAdminPassword(
  admin: { email: string },
  user: AdminUserRow,
  password: string,
  newAccount: boolean
): Promise<AdminUserRow> {
  await setUserPassword(user.id, await argon2.hash(password, { type: argon2.argon2id }));
  await logSystemEvent({
    source: "user_accounts",
    level: "info",
    event: "password_set_by_admin",
    message: `${admin.email} set the password of ${user.email ?? user.id}${newAccount ? " (new account)" : ""}`,
    details: {
      admin: admin.email,
      email: user.email,
      user_id: user.id,
      company: user.company_name,
      new_account: newAccount,
    },
  });
  return { ...user, status: "active" };
}

export async function createUserAction(data: Record<string, unknown>): Promise<ActionResult<AdminUserRow>> {
  try {
    const admin = await requireAdminUser();
    const { password, rest } = takeNewPassword(data);
    let user = await createUser(rest);
    if (password) user = await applyAdminPassword(admin, user, password, true);
    revalidatePath("/admin/users");
    invalidateHomepageCache();
    return { success: true, data: user };
  } catch (error) {
    console.error("[createUserAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create user" };
  }
}

export async function updateUserAction(id: string, data: Record<string, unknown>): Promise<ActionResult<AdminUserRow>> {
  try {
    const admin = await requireAdminUser();
    const { password, rest } = takeNewPassword(data);
    let user = await updateUser(id, rest);
    if (password) user = await applyAdminPassword(admin, user, password, false);
    revalidatePath("/admin/users");
    invalidateHomepageCache();
    return { success: true, data: user };
  } catch (error) {
    console.error("[updateUserAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update user" };
  }
}

/** Archive (soft-delete) a user, matching the existing company-rep removal flow. */
export async function deleteUserAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminUser();
    const result = await deleteUser(id);
    revalidatePath("/admin/users");
    invalidateHomepageCache();
    return result;
  } catch (error) {
    console.error("[deleteUserAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to archive user" };
  }
}

/* ------------------------- bulk representative import ------------------------- */

async function readImportFile(
  formData: FormData
): Promise<{ name: string; text: string; choices: ImportChoices }> {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file was uploaded");
  if (file.size > MAX_IMPORT_BYTES) throw new Error("The file is too large for an account list");
  return {
    name: file.name,
    text: await file.text(),
    choices: {
      companies: readCompanyChoices(formData.get("companyChoices")),
      skippedLines: readSkippedLines(formData.get("skippedLines")),
    },
  };
}

/** The line numbers left out in the preview: a JSON array of positive integers. */
function readSkippedLines(raw: FormDataEntryValue | null): number[] {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 100_000) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isSafeInteger(n) && n > 0) : [];
  } catch {
    return [];
  }
}

/**
 * The companies picked in the preview, as sent by the browser: a JSON object
 * of name key -> company id. Anything that is not string -> string is
 * dropped; the planner then checks each id against the companies table.
 */
function readCompanyChoices(raw: FormDataEntryValue | null): CompanyChoices {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 100_000) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((e): e is [string, string] => typeof e[1] === "string")
    );
  } catch {
    return {};
  }
}

/** What importing the uploaded CSV would do. Changes nothing. */
export async function previewRepAccountImportAction(formData: FormData): Promise<ActionResult<RepImportPlan>> {
  try {
    await requireAdminUser();
    const { text, choices } = await readImportFile(formData);
    return { success: true, data: await previewRepAccountImport(text, choices) };
  } catch (error) {
    console.error("[previewRepAccountImportAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Could not read the file" };
  }
}

/**
 * Creates or updates the representative accounts in the uploaded CSV, all or
 * nothing, and logs who did it under user_accounts / accounts_bulk_imported.
 * The file is planned again here rather than trusting the preview.
 */
export async function applyRepAccountImportAction(formData: FormData): Promise<ActionResult<RepImportRow[]>> {
  // Only an admin's failed import is logged: anyone can POST to an action, and
  // a stranger's rejected call must not be able to write to the log.
  let adminEmail: string | null = null;
  let fileName = "(none)";
  try {
    const admin = await requireAdminUser();
    adminEmail = admin.email;
    const file = await readImportFile(formData);
    fileName = file.name;

    const result = await applyRepAccountImport(file.text, file.choices);
    if (!result.ok) return { success: false, error: result.error };

    const created = result.rows.filter((r) => r.action === "create");
    const updated = result.rows.filter((r) => r.action === "update");
    const skipped = result.rows.filter((r) => r.action === "skip");
    // Names in the file the admin mapped to a company by hand, once each.
    const companyChoices = [
      ...new Map(
        result.rows.filter((r) => r.companyChosen).map((r) => [r.companyKey, { in_file: r.company, company: r.companyName }])
      ).values(),
    ];
    // Addresses and companies only -- never the passwords.
    await logSystemEvent({
      source: "user_accounts",
      level: "info",
      event: "accounts_bulk_imported",
      message: `${adminEmail} imported ${created.length + updated.length} representative accounts from ${fileName}: ${created.length} created, ${updated.length} updated${skipped.length ? `, ${skipped.length} line(s) skipped` : ""}`,
      details: {
        admin: adminEmail,
        file: fileName,
        ...(companyChoices.length > 0 ? { company_choices: companyChoices } : {}),
        created: created.map((r) => ({ email: r.email, company: r.companyName })),
        updated: updated.map((r) => ({
          email: r.email,
          company: r.companyName,
          ...(r.movedFrom ? { moved_from: r.movedFrom } : {}),
        })),
        ...(skipped.length > 0
          ? { skipped: skipped.map((r) => ({ line: r.line, email: r.email, company: r.company })) }
          : {}),
      },
    });

    revalidatePath("/admin/users");
    return { success: true, data: result.rows };
  } catch (error) {
    console.error("[applyRepAccountImportAction]", error);
    if (adminEmail) await logSystemEvent({
      source: "user_accounts",
      level: "error",
      event: "accounts_bulk_import_failed",
      message: `${adminEmail} could not import ${fileName}; nothing was changed`,
      details: { admin: adminEmail, file: fileName, error: error instanceof Error ? error.message : String(error) },
    });
    return { success: false, error: error instanceof Error ? error.message : "The import failed; nothing was changed" };
  }
}
