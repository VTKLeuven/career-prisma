"use server"

import { listOrders } from "@/lib/repos/orders";
import { listZones } from "@/lib/repos/zones";
import { getUserFromCookies } from "@/lib/auth-server";
import { getStudentFromCookies } from "@/lib/auth-student";
import { getAdminDirectusClient } from "@/lib/directus";
import { getOrderingSettings } from "@/lib/repos/ordering-settings";
import { updateItem, deleteItem, readItems } from "@directus/sdk";
import { revalidatePath } from "next/cache";
import type { Order } from "@/lib/schema";

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
    let shifterDisplayName = "";

    if (!user) {
        const student = await getStudentFromCookies();
        if (student && student.is_shifter) {
            userId = student.id;
            isStudentShifter = true;
            shifterDisplayName = [student.first_name, student.last_name].filter(Boolean).join(" ") || student.full_name || student.username || "Student";
        } else if (student) {
            return { success: false, error: "Not authorized as shifter" };
        }
    } else {
        // Directus user — build display name
        shifterDisplayName = user.name || user.email || "Staff";
    }

    if (!userId) return { success: false, error: "Not authenticated" };

    // Use admin client to bypass need for directus user token
    const client = getAdminDirectusClient();
    if (!client) return { success: false, error: "Server configuration error" };

    console.log("[pickUpOrderAction] orderId:", orderId, "userId:", userId, "isStudentShifter:", isStudentShifter, "shifterName:", shifterDisplayName);

    const updateData: any = {
        status: "preparing",
        shifter_name: shifterDisplayName,
    };

    // Only set the shifter FK for Directus users (UUID).
    // Student IDs are integers and can't be stored in the shifter field (UUID FK to directus_users).
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

type CompletedOrderWithDuration = Order & {
    durationMinutes: number;
    durationFormatted: string;
};

type OrdersPer15MinBucket = {
    label: string;
    start: string;
    end: string;
    count: number;
};

type OrdersPerBoothStat = {
    boothNumber: number | null;
    companyName: string | null;
    count: number;
};

type OrdersPerShifterStat = {
    name: string;
    count: number;
};

type CumulativeOrderPoint = {
    label: string;
    count: number;
};

type CompletedOrdersStats = {
    totalOrders: number;
    totalItems: number;
    avgDurationMinutes: number;
    medianDurationMinutes: number;
    fastestMinutes: number;
    slowestMinutes: number;
    per15MinBuckets: OrdersPer15MinBucket[];
    perBooth: OrdersPerBoothStat[];
    cumulativeOrders: CumulativeOrderPoint[];
    peakBucketLabel: string;
    ordersPerShifter: OrdersPerShifterStat[];
};

export async function fetchCompletedOrdersAction() {
    const allOrders = await listOrders({});
    const finishedOrders = allOrders.filter(o => o.status === "finished");


    // Determine a compact time window from the actual orders.
    // Use the active_event_id to determine the event day to filter by.
    const { activeEventId } = await getOrderingSettings();
    let eventDateString = "";
    let eventStartHour = "11:00";
    let eventEndHour = "17:30";

    if (activeEventId) {
        const client = await getAdminDirectusClient();
        if (client) {
            const events = await client.request(
                readItems("career_event" as any, {
                    filter: { id: { _eq: activeEventId } },
                    fields: ["date", "start_hour", "end_hour"],
                    limit: 1,
                })
            ) as any[];

            if (events && events.length > 0) {
                // Normalize date to YYYY-MM-DD if it contains a timestamp
                if (events[0].date) eventDateString = events[0].date.split('T')[0];
                if (events[0].start_hour) eventStartHour = events[0].start_hour;
                if (events[0].end_hour) eventEndHour = events[0].end_hour;
            }
        }
    }

    if (!eventDateString) {
        // Fallback to highest volume day if no active event is configured.
        const dateCounts: Record<string, number> = {};
        finishedOrders.forEach(o => {
            const dStr = new Date(o.date_created).toDateString();
            dateCounts[dStr] = (dateCounts[dStr] || 0) + 1;
        });

        let maxOrderCount = -1;
        Object.entries(dateCounts).forEach(([dStr, count]) => {
            if (count > maxOrderCount) {
                maxOrderCount = count;
                eventDateString = new Date(dStr).toISOString().split('T')[0];
            }
        });
    }


    // Filter ALL orders (both for list and stats) to the target event day.
    // Use date normalization to ensure robust comparison across formats.
    // Normalize a stored date/time string to YYYY-MM-DD as robustly as possible.
    const normalizeToDateString = (value: string): string => {
        // First try using the Date constructor – handles most ISO-like formats.
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split("T")[0];
        }

        // Fallback for non-ISO strings like "2025-02-01 10:00:00"
        // Take the first "date-like" part before a space or "T".
        const firstPart = value.split("T")[0].split(" ")[0];
        return firstPart;
    };

    const completedRaw = finishedOrders
        .filter(o => {
            if (!eventDateString) return true;
            const orderDate = normalizeToDateString(o.date_created);
            return orderDate === eventDateString;
        })
        .sort((a, b) => new Date(a.date_created).getTime() - new Date(b.date_created).getTime());


    const completedOrders: CompletedOrderWithDuration[] = completedRaw.map(order => {
        const createdTime = new Date(order.date_created).getTime();
        const updatedTime = new Date(order.date_updated).getTime();
        const durationMs = updatedTime - createdTime;
        const durationMinutes = Math.round(durationMs / 60000);

        return {
            ...order,
            durationMinutes,
            durationFormatted:
                durationMinutes < 60
                    ? `${durationMinutes}m`
                    : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
        };
    });

    if (completedOrders.length === 0) {
        return { orders: [], stats: null as CompletedOrdersStats | null };
    }

    // Basic duration stats
    const durations = completedOrders.map(o => o.durationMinutes).sort((a, b) => a - b);
    const totalOrders = completedOrders.length;
    const totalDuration = durations.reduce((acc, v) => acc + v, 0);
    const avgDurationMinutes = Math.round(totalDuration / totalOrders);
    const fastestMinutes = durations[0];
    const slowestMinutes = durations[durations.length - 1];
    const medianDurationMinutes =
        durations.length % 2 === 1
            ? durations[(durations.length - 1) / 2]
            : Math.round((durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2);

    // Total items served (drinks + snacks)
    const totalItems = completedOrders.reduce((acc, order) => {
        const items = order.items || [];
        return acc + items.reduce((sum, i) => sum + (i.quantity || 0), 0);
    }, 0);

    // Build fixed 15-minute buckets from 11:00 to 17:00 (24 buckets).
    // Use the event date to anchor the window. This gives a consistent x-axis.
    const bucketMs = 15 * 60 * 1000; // 15 minutes
    const fixedStartHour = 11;
    const fixedEndHour = 17;
    const bucketsPerHour = 4;
    const totalFixedBuckets = (fixedEndHour - fixedStartHour) * bucketsPerHour; // 24

    // Build a Date anchored to the event date at 11:00 local time
    const anchorDate = eventDateString ? new Date(eventDateString + "T00:00:00") : new Date();
    const anchorYear = anchorDate.getFullYear();
    const anchorMonth = anchorDate.getMonth();
    const anchorDay = anchorDate.getDate();
    const windowStartMs = new Date(anchorYear, anchorMonth, anchorDay, fixedStartHour, 0, 0).getTime();
    const windowEndMs = new Date(anchorYear, anchorMonth, anchorDay, fixedEndHour, 0, 0).getTime();

    const per15MinBuckets: OrdersPer15MinBucket[] = [];
    for (let i = 0; i < totalFixedBuckets; i++) {
        const start = new Date(windowStartMs + i * bucketMs);
        const end = new Date(windowStartMs + (i + 1) * bucketMs);
        const label = `${start.getHours().toString().padStart(2, "0")}:${start
            .getMinutes()
            .toString()
            .padStart(2, "0")}`;
        per15MinBuckets.push({
            label,
            start: start.toISOString(),
            end: end.toISOString(),
            count: 0,
        });
    }

    completedOrders.forEach(order => {
        const t = new Date(order.date_created).getTime();
        if (t < windowStartMs || t >= windowEndMs) return;
        const index = Math.floor((t - windowStartMs) / bucketMs);
        if (index >= 0 && index < per15MinBuckets.length) {
            per15MinBuckets[index].count += 1;
        }
    });

    // Cumulative orders: one point per 15-min bucket showing running total
    const cumulativeOrders: { label: string; count: number }[] = [];
    let runningTotal = 0;
    for (const bucket of per15MinBuckets) {
        runningTotal += bucket.count;
        cumulativeOrders.push({ label: bucket.label, count: runningTotal });
    }

    // Peak bucket
    const peakBucket = per15MinBuckets.reduce((best, b) => b.count > best.count ? b : best, per15MinBuckets[0]);
    const peakBucketLabel = peakBucket ? `${peakBucket.label} (${peakBucket.count} orders)` : "—";

    // Orders per shifter
    const shifterMap = new Map<string, number>();
    completedOrders.forEach(order => {
        const shifter = (order as any).shifter;
        const shifterName = (order as any).shifter_name;
        let name = "Unassigned";
        if (shifterName) {
            name = shifterName;
        } else if (shifter && typeof shifter === 'object') {
            name = shifter.first_name || shifter.name || "Unknown";
        }
        shifterMap.set(name, (shifterMap.get(name) || 0) + 1);
    });
    const ordersPerShifter = Array.from(shifterMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    // Orders per booth (for a simple "top booths" chart)
    const boothMap = new Map<string, OrdersPerBoothStat>();
    completedOrders.forEach(order => {
        const booth: any = (order as any).booth;
        const boothNumber: number | null = typeof booth?.booth_number === "number" ? booth.booth_number : null;
        const companyName: string | null = booth?.company?.name ?? null;
        const key = `${boothNumber ?? "unknown"}::${companyName ?? "unknown"}`;
        const existing = boothMap.get(key);
        if (existing) {
            existing.count += 1;
        } else {
            boothMap.set(key, {
                boothNumber,
                companyName,
                count: 1,
            });
        }
    });

    const perBooth = Array.from(boothMap.values()).sort((a, b) => b.count - a.count);

    const stats: CompletedOrdersStats = {
        totalOrders,
        totalItems,
        avgDurationMinutes,
        medianDurationMinutes,
        fastestMinutes,
        slowestMinutes,
        per15MinBuckets,
        perBooth,
        cumulativeOrders,
        peakBucketLabel,
        ordersPerShifter,
    };

    return { orders: completedOrders, stats };
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
