"use server"

import { listOrders } from "@/lib/repos/orders";
import { listZones } from "@/lib/repos/zones";
import { getUserFromCookies } from "@/lib/auth-server";
import { getStudentFromCookies } from "@/lib/auth-student";
import { getAdminDirectusClient } from "@/lib/directus";
import { updateItem, deleteItem } from "@directus/sdk";
import { revalidatePath } from "next/cache";

// Resolve zone for an order - must match getOrderZone logic in shifter client
function getOrderZoneId(order: { booth?: { id?: string } | string; zone?: { id?: string } | string }, zones: { id: string; booths?: any[] }[]): string | null {
    const boothId = (order.booth as any)?.id ?? order.booth;
    if (!boothId) return null;

    // Primary: zone.booths M2M - find which zone contains this booth
    for (const zone of zones) {
        if (zone.booths && Array.isArray(zone.booths)) {
            const found = zone.booths.some((b: any) => {
                const bId = typeof b === 'object' ? b.id : b;
                return String(bId) === String(boothId);
            });
            if (found) return zone.id;
        }
    }

    // Fallback: booth.zone
    const boothZone = (order.booth as any)?.zone;
    if (boothZone) {
        if (typeof boothZone === 'object') return boothZone.id ?? null;
        return boothZone;
    }

    // Fallback: order.zone
    if (order.zone) {
        if (typeof order.zone === 'object') return (order.zone as any).id ?? null;
        return order.zone as string;
    }
    return null;
}

export async function fetchOrdersAction(zoneId?: string) {
    const allOrders = await listOrders({});

    let activeOrders = allOrders.filter(o => o.status !== 'finished');

    if (zoneId && zoneId !== 'all') {
        // Use same zone resolution as shifter dashboard display (zone.booths M2M)
        const zones = await listZones();
        activeOrders = activeOrders.filter(o => getOrderZoneId(o, zones) === zoneId);
    }

    return activeOrders.sort((a, b) => new Date(a.date_created).getTime() - new Date(b.date_created).getTime());
}

export async function pickUpOrderAction(orderId: string) {
    let user = await getUserFromCookies();
    let userId = user?.id;
    let isStudentShifter = false;

    if (!user) {
        const student = await getStudentFromCookies();
        if (student && student.is_shifter) {
            userId = student.id;
            isStudentShifter = true;
        } else if (student) {
            return { success: false, error: "Not authorized as shifter" };
        }
    }

    if (!userId) return { success: false, error: "Not authenticated" };

    // Use admin client to bypass need for directus user token
    const client = getAdminDirectusClient();
    if (!client) return { success: false, error: "Server configuration error" };

    console.log("[pickUpOrderAction] orderId:", orderId, "userId:", userId, "isStudentShifter:", isStudentShifter);

    // Only set shifter if it's a directus_user (UUID). 
    // Student IDs are integers and can't be stored in the shifter field (which is a UUID FK to directus_users)
    const updateData: any = {
        status: "preparing",
    };

    if (!isStudentShifter && userId) {
        updateData.shifter = userId;
    }

    await client.request(updateItem("orders" as any, orderId, updateData));

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

    const client = getAdminDirectusClient();
    if (!client) return { success: false, error: "Server configuration error" };

    await client.request(updateItem("orders" as any, orderId, {
        status: "finished",
    }));

    revalidatePath("/dashboard/shifter");
    return { success: true };
}

export async function fetchCompletedOrdersAction(limit: number = 50) {
    const allOrders = await listOrders({});

    // Filter for finished orders only
    const completedOrders = allOrders
        .filter(o => o.status === 'finished')
        .sort((a, b) => new Date(b.date_updated).getTime() - new Date(a.date_updated).getTime())
        .slice(0, limit);

    // Calculate statistics for each order
    return completedOrders.map(order => {
        const createdTime = new Date(order.date_created).getTime();
        const updatedTime = new Date(order.date_updated).getTime();
        const durationMs = updatedTime - createdTime;
        const durationMinutes = Math.round(durationMs / 60000);

        return {
            ...order,
            durationMinutes,
            durationFormatted: durationMinutes < 60
                ? `${durationMinutes}m`
                : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
        };
    });
}

export async function deleteOrderAction(orderId: string) {
    // Check auth
    let user = await getUserFromCookies();
    let isAuthorized = !!user;

    if (!user) {
        const student = await getStudentFromCookies();
        if (student && student.is_shifter) {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) return { success: false, error: "Not authorized" };

    const client = getAdminDirectusClient();
    if (!client) return { success: false, error: "Server configuration error" };

    try {
        await client.request(deleteItem("orders" as any, orderId));
        revalidatePath("/dashboard/shifter");
        return { success: true };
    } catch (error) {
        console.error("Error deleting order:", error);
        return { success: false, error: "Failed to delete order" };
    }
}
