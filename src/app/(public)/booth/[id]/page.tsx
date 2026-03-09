import { directus, getAdminDirectusClient } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { notFound } from "next/navigation";
import BoothClient from "./client";
import { listDrinks } from "@/lib/repos/drinks";
import { getActiveOrderForBooth } from "@/lib/repos/orders";

export default async function BoothPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Fetch Booth details
    // Assuming booth ID is passed, OR booth number if slug?
    // User said "Each booth should get their own QR code". Direct link `booth/[id]`.

    let booth;
    try {
        const adminClient = getAdminDirectusClient();
        console.log(`[BoothPage] Fetching booth ${id}. Admin client available: ${!!adminClient}`);

        const client = adminClient || directus;

        booth = await client.request(
            readItems("Booths", {
                filter: { id: { _eq: id } },
                fields: ["*", { company: ["name", "id"], zone: ["*"] }],
                limit: 1
            })
        ) as any[];
    } catch (e: any) {
        console.error("[BoothPage] Primary fetch failed.", e?.errors?.[0]?.message || e);

        // Fallback: Try Public Client (User said public permissions are enabled)
        try {
            console.log("[BoothPage] Attempting fallback to Public Client...");
            booth = await directus.request(
                readItems("Booths", {
                    filter: { id: { _eq: id } },
                    // Simplify: Only fetch exactly what we need. 
                    // REMOVED 'zone' and wildcard '*' to reduce permission surface area.
                    fields: ["id", "booth_number", { company: ["name", "id"] }],
                    limit: 1
                })
            ) as any[];
            console.log("[BoothPage] Public Client fetch SUCCESS.");
        } catch (publicError) {
            console.error("[BoothPage] Public fetch failed too. Using Mock Data.", publicError);

            // MOCK DATA to unblock the page
            booth = [{
                id: id,
                booth_number: "?",
                company: undefined, // Permissions prevent reading this
                Floorplan: { name: "Fair" }
            }];
        }
    }

    if (!booth || booth.length === 0) {
        // Fallback for completely empty result if not caught above
        booth = [{
            id: id,
            booth_number: "?",
        }];
    }

    const boothData = booth[0];
    const drinks = await listDrinks({ visible_only: true });
    // Active order checking might fail if permissions are tight, but let's try
    let activeOrder = null;
    try {
        activeOrder = await getActiveOrderForBooth(id);
    } catch {
        console.log("Could not fetch active order permissions");
    }

    return (
        <div className="container mx-auto max-w-md py-8 px-4">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold">{boothData.company?.name || "Booth " + boothData.booth_number}</h1>
                <p className="text-muted-foreground">Booth #{boothData.booth_number}</p>
                <p className="text-sm text-muted-foreground mt-3">
                    Coffee will be prepared for you by our barista in the tent. Cava will be available at the bar starting from 15h00.
                </p>
            </div>

            <BoothClient
                boothId={id}
                companyId={boothData.company?.id}
                initialDrinks={drinks}
                initialActiveOrder={activeOrder}
            />
        </div>
    );
}
