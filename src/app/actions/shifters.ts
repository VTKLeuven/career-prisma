"use server"

import { readUsers, updateUser } from "@directus/sdk";
import { directus, getAdminDirectusClient } from "@/lib/directus";
import { revalidatePath } from "next/cache";

export async function listAllUsersAction(search?: string) {
    try {
        const client = await getAdminDirectusClient() || directus;

        // Typecast to any because readUsers return type might be strict about system fields
        const users = await client.request(readUsers({
            fields: ["id", "first_name", "last_name", "email", "is_shifter", "role.name"],
            search: search,
            limit: 50,
        })) as any[];

        return users;
    } catch (error) {
        console.error("Error listing users:", error);
        return [];
    }
}

export async function toggleShifterStatusAction(userId: string, isShifter: boolean) {
    try {
        const client = await getAdminDirectusClient();
        if (!client) throw new Error("No admin client available");

        await client.request(updateUser(userId, {
            is_shifter: isShifter,
        } as any));

        revalidatePath("/admin/shifters");
        return { success: true };
    } catch (error) {
        console.error("Error toggling shifter status:", error);
        return { success: false, error: "Failed to update user" };
    }
}
