// app/actions/salespeople.ts
"use server";

import { listSalespersons } from "@/lib/repos/users";

export async function fetchSalespersonsAction() {
    const salespersons = await listSalespersons({ limit: 50, sort: "first_name" }) ?? [];
    return salespersons
}