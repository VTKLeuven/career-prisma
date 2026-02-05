"use server"

import { readItems, updateItem } from "@directus/sdk";
import { directus, getAdminDirectusClient } from "@/lib/directus";
import { revalidatePath } from "next/cache";

export async function listAllUsersAction(search?: string) {
    try {
        const client = await getAdminDirectusClient() || directus;

        // Query students collection
        const query: any = {
            fields: ["id", "first_name", "last_name", "email", "is_shifter"],
            limit: 50,
        };

        if (search) {
            query.search = search;
        } else {
            // Default view: show existing shifters when no search provided
            query.filter = { is_shifter: { _eq: true } };
        }

        const students = await client.request(readItems('students', query)) as any[];

        return students;
    } catch (error) {
        // console.error("Error listing students:", error);
        return [];
    }
}

export async function toggleShifterStatusAction(userId: string, isShifter: boolean) {
    try {
        const client = await getAdminDirectusClient();
        if (!client) throw new Error("No admin client available");

        await client.request(updateItem('students', userId, {
            is_shifter: isShifter,
        } as any));

        revalidatePath("/admin/shifters");
        return { success: true };
    } catch (error) {
        console.error("Error toggling shifter status:", error);
        return { success: false, error: "Failed to update user" };
    }
}
