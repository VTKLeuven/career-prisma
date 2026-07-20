"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth-server";
import {
  listUsers,
  listRoles,
  createUser,
  updateUser,
  deleteUser,
  generateInviteToken,
  type AdminUserRow,
} from "@/lib/repos/users";
import { listCompaniesBasic } from "@/lib/repos/company";
import { sendEmail } from "@/lib/email";
import { generateInvitationEmailHtml } from "@/lib/email-templates";
import type { ActionResult, SelectOption } from "@/components/admin/types";

export async function listUsersAction(): Promise<AdminUserRow[]> {
  await requireAdminUser();
  return listUsers();
}

export async function listRoleOptionsAction(): Promise<SelectOption[]> {
  await requireAdminUser();
  const roles = await listRoles();
  return roles.map((r) => ({ value: r.id, label: r.name }));
}

export async function listCompanyOptionsAction(): Promise<SelectOption[]> {
  await requireAdminUser();
  const companies = await listCompaniesBasic();
  return companies.map((c) => ({ value: c.id, label: c.name ?? "(unnamed)" }));
}

export async function createUserAction(data: Record<string, unknown>): Promise<ActionResult<AdminUserRow>> {
  try {
    await requireAdminUser();
    const user = await createUser(data);
    revalidatePath("/admin/users");
    return { success: true, data: user };
  } catch (error) {
    console.error("[createUserAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create user" };
  }
}

export async function updateUserAction(id: string, data: Record<string, unknown>): Promise<ActionResult<AdminUserRow>> {
  try {
    await requireAdminUser();
    const user = await updateUser(id, data);
    revalidatePath("/admin/users");
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
    return result;
  } catch (error) {
    console.error("[deleteUserAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to archive user" };
  }
}

/** (Re)send an invitation email to a user. */
export async function sendUserInviteAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminUser();
    const tokenData = await generateInviteToken(id);
    if (!tokenData?.token) return { success: false, error: "Could not generate an invite token" };

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_FORM_DOMAIN ||
      "http://localhost:3000";
    const acceptInviteUrl = `${baseUrl}/accept-invite?token=${encodeURIComponent(tokenData.token)}`;

    await sendEmail({
      to: tokenData.email,
      subject: "Welcome to VTK Career Platform",
      html: generateInvitationEmailHtml({ acceptInviteUrl }),
    });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("[sendUserInviteAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to send invite" };
  }
}
