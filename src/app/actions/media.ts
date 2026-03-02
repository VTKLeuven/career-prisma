"use server";

import { getAuthedDirectusOrThrow, getAdminDirectusClient } from "@/lib/directus";
import { uploadFiles } from "@directus/sdk";

export async function uploadFileAction(formData: FormData) {
    try {
        const file = formData.get("file") as File;
        if (!file) {
            return { success: false, error: "No file provided" };
        }

        const client = getAdminDirectusClient() || await getAuthedDirectusOrThrow();

        // Directus SDK expects FormData exactly as valid for the API
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        // Add optional title if needed, or other metadata
        // uploadFormData.append("title", file.name);

        const result = await client.request(uploadFiles(uploadFormData));

        return { success: true, data: result };
    } catch (error) {
        console.error("Upload error:", error);
        return { success: false, error: "Failed to upload file" };
    }
}
