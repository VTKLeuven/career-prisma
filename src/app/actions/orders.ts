"use server"

import { listOrders } from "@/lib/repos/orders";
import { getUserFromCookies } from "@/lib/auth-server";
import { getStudentFromCookies } from "@/lib/auth-student";
import { getAdminDirectusClient } from "@/lib/directus";
import { updateItem } from "@directus/sdk";
import { revalidatePath } from "next/cache";

export async function fetchOrdersAction(zoneId?: string) {
    // Fetch Pending and Preparing orders
    // We can't do OR in listOrders easily without modifying it or custom filter.
    // I'll update listOrders to handle filtering properly or just fetch all active.
    const allOrders = await listOrders({});

    // Filter in memory for now if repo doesn't support advanced OR
    // But let's assume we want Pending or Preparing
    let activeOrders = allOrders.filter(o => o.status !== 'finished');

    if (zoneId && zoneId !== 'all') {
        // Filter by zone if relational or denormalized
        // activeOrders = activeOrders.filter(o => o.zone === zoneId || o.booth?.zone === zoneId);
        // Need valid zone logic. Assuming order.zone is populated.
        // If not, we might need to rely on booth.zone
        // Let's assume order.zone matches or booth.zone matches
        activeOrders = activeOrders.filter(o => {
            // Check explicit zone field on order
            if (typeof o.zone === 'string' && o.zone === zoneId) return true;
            if (typeof o.zone === 'object' && o.zone?.id === zoneId) return true;

            // Check booth zone
            // @ts-ignore
            const boothZone = o.booth?.zone;
            if (typeof boothZone === 'string' && boothZone === zoneId) return true;
            if (typeof boothZone === 'object' && boothZone?.id === zoneId) return true;

            return false;
        });
    }

    return activeOrders.sort((a, b) => new Date(a.date_created).getTime() - new Date(b.date_created).getTime());
}

export async function pickUpOrderAction(orderId: string) {
    let user = await getUserFromCookies();
    let userId = user?.id;

    if (!user) {
        const student = await getStudentFromCookies();
        if (student && student.is_shifter) {
            userId = student.id;
        } else if (student) {
            return { success: false, error: "Not authorized as shifter" };
        }
    }

    if (!userId) return { success: false, error: "Not authenticated" };

    // Use admin client to bypass need for directus user token
    const client = await getAdminDirectusClient();
    if (!client) return { success: false, error: "Server configuration error" };

    await client.request(updateItem("orders", orderId, {
        status: "preparing",
        shifter: userId,
    }));

    revalidatePath("/dashboard/shifter");
    try {
        // Best effort revalidation
        revalidatePath(`/booth/${orderId}`);
    } catch (e) { }

    return { success: true };
}

export async function finishOrderAction(orderId: string) {
    // Check auth (even though we don't need user ID for the update, we need permission)
    let user = await getUserFromCookies();
    let isAuthorized = !!user;

    if (!user) {
        const student = await getStudentFromCookies();
        if (student && student.is_shifter) {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) return { success: false, error: "Not authorized" };

    const client = await getAdminDirectusClient();
    if (!client) return { success: false, error: "Server configuration error" };

    await client.request(updateItem("orders", orderId, {
        status: "finished",
    }));

    revalidatePath("/dashboard/shifter");
    return { success: true };
}
