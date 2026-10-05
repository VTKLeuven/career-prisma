"use server";

import { revalidatePath } from "next/cache";
import { getUserFromCookies } from "@/lib/auth-server";
import { searchStudentsForShifters, setStudentShifter } from "@/lib/repos/students";

export async function listAllUsersAction(search?: string) {
  const user = await getUserFromCookies();
  if (!user?.admin) return [];
  return searchStudentsForShifters(search);
}

export async function toggleShifterStatusAction(
  userId: string,
  isShifter: boolean
) {
  try {
    const user = await getUserFromCookies();
    if (!user?.admin) throw new Error("Unauthorized");
    await setStudentShifter(userId, isShifter);
    revalidatePath("/admin/shifters");
    return { success: true };
  } catch (error) {
    console.error("Error toggling shifter status:", error);
    return { success: false, error: "Failed to update user" };
  }
}
