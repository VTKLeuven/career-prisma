"use server";

import { getUserFromCookies } from "@/lib/auth-server";
import { uploadFile } from "@/lib/file-storage";

export async function uploadFileAction(formData: FormData) {
  try {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, error: "No file provided" };
    }
    const user = await getUserFromCookies();
    if (!user) return { success: false, error: "Unauthorized" };
    const id = await uploadFile(file, user.id);
    return { success: true, data: { id } };
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, error: "Failed to upload file" };
  }
}
