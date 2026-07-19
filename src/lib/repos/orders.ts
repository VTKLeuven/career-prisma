"use server"

import { prisma } from "@/lib/prisma";
import { ORDER_INCLUDE, shapeOrder } from "@/lib/repos/_shape";
import type { Order } from "@/lib/schema";

/**
 * Note on the `zone_id` option: orders never carried a usable zone.
 * The `orders.zone` column was NULL across all 374 production rows and has been
 * dropped; zone membership is resolved through the zones<->booths join instead
 * (see getOrderZoneId in app/actions/orders.ts). The parameter is kept so
 * callers do not need to change, but filtering by it now goes through booths.
 */
export async function listOrders(opts?: {
    status?: string;
    zone_id?: string;
    my_shifter_orders?: boolean;
    shifter_id?: string;
}) {
    try {
        const zoneId = opts?.zone_id ? Number(opts.zone_id) : undefined;

        const rows = await prisma.order.findMany({
            where: {
                ...(opts?.status ? { status: opts.status } : {}),
                ...(opts?.shifter_id ? { shifter_id: opts.shifter_id } : {}),
                ...(zoneId !== undefined && !Number.isNaN(zoneId)
                    ? { booth: { zoneBooths: { some: { zone_id: zoneId } } } }
                    : {}),
            },
            include: ORDER_INCLUDE,
            // Newest first. No limit: the statistics views need full history,
            // which is what Directus' `limit: -1` was doing here.
            orderBy: { date_created: "desc" },
        });

        return rows.map(shapeOrder) as Order[];
    } catch (error) {
        console.error("Error listing orders:", error);
        return [];
    }
}

export async function createOrder(data: Partial<Order>) {
    // Booth visitors place orders over the QR code without logging in, so this
    // deliberately performs no auth check -- as before.
    const { booth, shifter, id, ...rest } = data as Record<string, any>;

    const row = await prisma.order.create({
        data: {
            ...rest,
            ...(booth != null
                ? { booth_id: typeof booth === "object" ? Number(booth.id) : Number(booth) }
                : {}),
            ...(shifter != null
                ? { shifter_id: typeof shifter === "object" ? shifter.id : shifter }
                : {}),
        },
        include: ORDER_INCLUDE,
    });

    return shapeOrder(row) as Order;
}

export async function updateOrder(id: string, data: Partial<Order>) {
    const { booth, shifter, id: _ignored, ...rest } = data as Record<string, any>;

    const row = await prisma.order.update({
        where: { id: Number(id) },
        data: {
            ...rest,
            ...(booth !== undefined
                ? { booth_id: booth == null ? null : typeof booth === "object" ? Number(booth.id) : Number(booth) }
                : {}),
            ...(shifter !== undefined
                ? { shifter_id: shifter == null ? null : typeof shifter === "object" ? shifter.id : shifter }
                : {}),
            date_updated: new Date(),
        },
        include: ORDER_INCLUDE,
    });

    return shapeOrder(row) as Order;
}

export async function getActiveOrderForBooth(boothId: string) {
    const row = await prisma.order.findFirst({
        where: {
            booth_id: Number(boothId),
            status: { in: ["pending", "preparing"] },
        },
        include: ORDER_INCLUDE,
    });

    return (shapeOrder(row) as Order) ?? null;
}
