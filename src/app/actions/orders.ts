"use server"

import { listOrders, updateOrder } from "@/lib/repos/orders";
import { getUserFromCookies } from "@/lib/auth-server";
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

    return activeOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export async function pickUpOrderAction(orderId: string) {
    const user = await getUserFromCookies();
    if (!user) return { success: false, error: "Not authenticated" };

    await updateOrder(orderId, {
        status: "preparing",
        shifter: user.id,
    });
    revalidatePath("/dashboard/shifter");
    revalidatePath(`/booth/${orderId}`); // Invalidating booth page might be tricky if ID is unknown
    return { success: true };
}

export async function finishOrderAction(orderId: string) {
    await updateOrder(orderId, {
        status: "finished",
    });
    revalidatePath("/dashboard/shifter");
    return { success: true };
}
