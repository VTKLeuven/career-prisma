"use server";

import { getUserFromCookies } from "@/lib/auth-server";

export async function debugTokenAction() {
  const user = await getUserFromCookies();
  if (!user) {
    return { success: false, message: "No valid application session." };
  }
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      roleName: user.role,
      isAdmin: user.admin,
    },
  };
}
