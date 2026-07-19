"use server";

import { revalidatePath } from "next/cache";
import { getUserFromCookies } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

export async function listAllUsersAction(search?: string) {
  const user = await getUserFromCookies();
  if (!user?.admin) return [];
  return prisma.student.findMany({
    where: search
      ? {
          OR: [
            { first_name: { contains: search, mode: "insensitive" } },
            { last_name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : { is_shifter: true },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      is_shifter: true,
    },
    take: 50,
  });
}

export async function toggleShifterStatusAction(
  userId: string,
  isShifter: boolean
) {
  try {
    const user = await getUserFromCookies();
    if (!user?.admin) throw new Error("Unauthorized");
    await prisma.student.update({
      where: { id: Number(userId) },
      data: { is_shifter: isShifter, date_updated: new Date() },
    });
    revalidatePath("/admin/shifters");
    return { success: true };
  } catch (error) {
    console.error("Error toggling shifter status:", error);
    return { success: false, error: "Failed to update user" };
  }
}
