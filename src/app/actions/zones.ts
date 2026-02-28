"use server"

import { createZone, deleteZone, updateZone } from "@/lib/repos/zones";
import { getUserFromCookies } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";

export async function createZoneAction(data: any) {
    try {
        const user = await getUserFromCookies();
        if (!user?.admin) return { success: false, error: "Unauthorized" };

        await createZone(data);
        revalidatePath("/admin/zones");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to create zone" };
    }
}

export async function updateZoneAction(id: string, data: any) {
    try {
        const user = await getUserFromCookies();
        if (!user?.admin) return { success: false, error: "Unauthorized" };

        await updateZone(id, data);
        revalidatePath("/admin/zones");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to update zone" };
    }
}

export async function deleteZoneAction(id: string) {
    try {
        const user = await getUserFromCookies();
        if (!user?.admin) return { success: false, error: "Unauthorized" };

        await deleteZone(id);
        revalidatePath("/admin/zones");
        revalidatePath("/admin/drinks");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to delete zone" };
    }
}
