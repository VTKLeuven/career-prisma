"use server"

import { createDrink, deleteDrink, updateDrink } from "@/lib/repos/drinks";
import { revalidatePath } from "next/cache";

export async function createDrinkAction(data: any) {
    try {
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
        await deleteDrink(id);
        revalidatePath("/admin/drinks");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to delete drink" };
    }
}
