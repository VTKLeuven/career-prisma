"use server"

import { createOrder, getActiveOrderForBooth } from "@/lib/repos/orders";
import { revalidatePath } from "next/cache";

export async function placeOrderAction(boothId: string, companyId: string, items: { drink_id: string; name: string; quantity: number }[]) {
    try {
        // Double check active order
        const existing = await getActiveOrderForBooth(boothId);
        if (existing) {
            return { success: false, error: "You already have an active order being prepared." };
        }

        if (items.length === 0) {
            return { success: false, error: "Order is empty" };
        }

        await createOrder({
            booth: boothId,
            company: companyId,
            items: items,
            status: "pending",
            // date_created: new Date().toISOString(), // Directus handles this
        });

        revalidatePath(`/booth/${boothId}`);
        return { success: true };
    } catch (error) {
        console.error("Error placing order:", error);
        return { success: false, error: "Failed to place order." };
    }
}

export async function checkOrderStatusAction(boothId: string) {
    const order = await getActiveOrderForBooth(boothId);
    return order;
}
