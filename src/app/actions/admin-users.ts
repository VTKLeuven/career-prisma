"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth-server";
import {
  createUser,
  updateUser,
  deleteUser,
  type AdminUserRow,
} from "@/lib/repos/users";
// Every write below can change the homepage team section -- a new salesperson,
// an edited name, photo or card link, an archived account, or an invite that
// flips the status back to `invited` and drops them from the list. Without this
// the change stays invisible for up to the cache TTL and reads as a failed save.
import { invalidateHomepageCache } from "@/lib/homepage-cache";
import type { ActionResult } from "@/components/admin/types";

export async function createUserAction(data: Record<string, unknown>): Promise<ActionResult<AdminUserRow>> {
  try {
    await requireAdminUser();
    const user = await createUser(data);
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
    await requireAdminUser();
    const user = await updateUser(id, data);
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

