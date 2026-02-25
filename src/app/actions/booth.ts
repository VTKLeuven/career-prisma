"use server"

import { createOrder, getActiveOrderForBooth } from "@/lib/repos/orders";
import { getAdminDirectusClient } from "@/lib/directus";
import { deleteItem, readItem } from "@directus/sdk";
import { revalidatePath } from "next/cache";

export async function placeOrderAction(boothId: string, companyId: string | null | undefined, items: { drink_id: string; name: string; quantity: number }[]) {
    try {
        // Double check active order
        const existing = await getActiveOrderForBooth(boothId);
        if (existing) {
            return { success: false, error: "You already have an active order being prepared." };
        }

        if (items.length === 0) {
            return { success: false, error: "Order is empty" };
        }

        const orderData: any = {
            booth: parseInt(boothId, 10), // Database expects integer
            items: items,
            status: "pending",
        };

        // Only add company if it's a valid integer ID (not a UUID)
        if (companyId && /^\d+$/.test(companyId)) {
            orderData.company = parseInt(companyId, 10);
        }

        await createOrder(orderData);

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

export async function cancelOrderAction(boothId: string, orderId: string) {
    try {
        const client = getAdminDirectusClient();
        if (!client) return { success: false, error: "Server configuration error" };

        const order = await client.request(readItem("orders" as any, orderId)) as any;
        if (!order) return { success: false, error: "Order not found" };

        const orderBoothId = typeof order.booth === "object" ? order.booth?.id : order.booth;
        if (String(orderBoothId) !== String(boothId)) {
            return { success: false, error: "Order does not belong to this booth" };
        }

        if (order.status !== "pending") {
            return { success: false, error: "Only pending orders can be cancelled" };
        }

        await client.request(deleteItem("orders" as any, orderId));
        revalidatePath(`/booth/${boothId}`);
        return { success: true };
    } catch (error) {
        console.error("Error cancelling order:", error);
        return { success: false, error: "Failed to cancel order" };
    }
}
