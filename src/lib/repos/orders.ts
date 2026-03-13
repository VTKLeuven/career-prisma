"use server"

import { readItems, createItem, updateItem } from "@directus/sdk";
import { directus, getAuthedDirectusOrThrow, getAdminDirectusClient } from "@/lib/directus";
import type { Order } from "@/lib/schema";

export async function listOrders(opts?: {
    status?: string;
    zone_id?: string;
    my_shifter_orders?: boolean;
    shifter_id?: string;
}) {
    try {
        const filter: Record<string, any> = {};

        if (opts?.status) {
            filter.status = { _eq: opts.status };
        }
        if (opts?.zone_id) {
            // Assuming orders have a snapshot of zone, or we link via booth
            // For simplicity, let's assume 'zone' field on order is populated or we filter by booth's zone
            // If schema has zone relation:
            filter.zone = { _eq: opts.zone_id };
        }
        if (opts?.shifter_id) {
            filter.shifter = { _eq: opts.shifter_id };
        }

        const client = getAdminDirectusClient() || directus; // Orders might be sensitive? Use Admin or Authed

        return client.request(
            readItems("orders" as any, {
                fields: ["*", "booth.*" as any, "booth.company.*" as any, "booth.zone.*" as any, "shifter.*" as any],
                filter,
                sort: ["-date_created"] as any, // Newest first
                // For statistics we want to be able to see the full history,
                // so explicitly request all orders instead of Directus' default limit.
                limit: -1 as any,
            })
        ) as unknown as Promise<Order[]>;
    } catch (error) {
        console.error("Error listing orders:", error);
        return [];
    }
}

export async function createOrder(data: Partial<Order>) {
    // Use admin client to bypass public permission restrictions
    // This allows booth visitors (unauthenticated users) to place orders via the QR code
    const client = getAdminDirectusClient() || directus;
    return client.request(createItem("orders" as any, data)) as Promise<Order>;
}

export async function updateOrder(id: string, data: Partial<Order>) {
    const client = await getAuthedDirectusOrThrow();
    return client.request(updateItem("orders" as any, id, data)) as Promise<Order>;
}

export async function getActiveOrderForBooth(boothId: string) {
    // Use admin client to check for active orders - this allows unauthenticated booth visitors
    const client = getAdminDirectusClient() || directus;
    const boothIdInt = parseInt(boothId, 10);
    const orders = await client.request(
        readItems("orders" as any, {
            filter: {
                booth: { _eq: boothIdInt },
                status: { _in: ["pending", "preparing"] }
            },
            limit: 1,
        })
    ) as Order[];
    return orders[0] || null;
}
