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

        const client = await getAdminDirectusClient() || directus; // Orders might be sensitive? Use Admin or Authed

        return client.request(
            readItems("orders", {
                fields: ["*", "booth.*", "booth.company.*", "shifter.*"],
                filter,
                sort: ["-date_created"], // Newest first
            })
        ) as Promise<Order[]>;
    } catch (error) {
        console.error("Error listing orders:", error);
        return [];
    }
}

export async function createOrder(data: Partial<Order>) {
    // Public can create orders (booth), so use plain client or specific limited client?
    // Booths are probably not authenticated as 'users' but identified by the page they are on.
    // We can use the public client if permissions allow "Public create orders".
    // If not, we might need a server token wrapper.
    // Let's assume public create is allowed for now, or use server token.
    const client = directus;
    return client.request(createItem("orders", data)) as Promise<Order>;
}

export async function updateOrder(id: string, data: Partial<Order>) {
    const client = await getAuthedDirectusOrThrow();
    return client.request(updateItem("orders", id, data)) as Promise<Order>;
}

export async function getActiveOrderForBooth(boothId: string) {
    const client = directus;
    const orders = await client.request(
        readItems("orders", {
            filter: {
                booth: { _eq: boothId },
                status: { _in: ["pending", "preparing"] }
            },
            limit: 1,
        })
    ) as Order[];
    return orders[0] || null;
}
