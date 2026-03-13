"use server"

import { createDrink, deleteDrink, updateDrink } from "@/lib/repos/drinks";
import { getOrderingSettings, setOrderingSettings } from "@/lib/repos/ordering-settings";
import { getUserFromCookies } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";

export async function getOrderingSettingsAction(): Promise<{ enabled: boolean, activeEventId: string | null }> {
    const user = await getUserFromCookies();
    if (!user?.admin) return { enabled: false, activeEventId: null };
    return getOrderingSettings();
}

export async function setOrderingSettingsAction(enabled: boolean, activeEventId: string | null) {
    const user = await getUserFromCookies();
    if (!user?.admin) return { success: false, error: "Unauthorized" };

    const ok = await setOrderingSettings(enabled, activeEventId);
    if (!ok) return { success: false, error: "Failed to update setting" };

    revalidatePath("/admin/drinks");
    return { success: true };
}

export async function createDrinkAction(data: any) {
    try {
        const user = await getUserFromCookies();
        if (!user?.admin) return { success: false, error: "Unauthorized" };

        await createDrink(data);
        revalidatePath("/admin/drinks");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to create drink" };
    }
}

export async function updateDrinkAction(id: string, data: any) {
    try {
        const user = await getUserFromCookies();
        if (!user?.admin) return { success: false, error: "Unauthorized" };

        await updateDrink(id, data);
        revalidatePath("/admin/drinks");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to update drink" };
    }
}

export async function deleteDrinkAction(id: string) {
    try {
        const user = await getUserFromCookies();
        if (!user?.admin) return { success: false, error: "Unauthorized" };

        await deleteDrink(id);
        revalidatePath("/admin/drinks");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to delete drink" };
    }
}
