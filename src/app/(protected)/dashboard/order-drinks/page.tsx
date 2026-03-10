import { directus, getAdminDirectusClient } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { redirect } from "next/navigation";
import BoothClient from "@/app/(public)/booth/[id]/client";
import { listDrinks } from "@/lib/repos/drinks";
import { getActiveOrderForBooth } from "@/lib/repos/orders";
import { getUserFromCookies } from "@/lib/auth-server";
import { getCompanyOrderingTabInfo } from "@/app/actions/ordering";

export default async function DashboardOrderDrinksPage() {
    // Get logged-in user
    const user = await getUserFromCookies();
    if (!user?.company?.id) {
        redirect("/dashboard");
    }

    // Resolve the booth ID for this company
    const { enabled, boothId } = await getCompanyOrderingTabInfo(user.company.id);
    if (!enabled || !boothId) {
        redirect("/dashboard");
    }

    // Fetch booth details (same logic as public booth page)
    let booth;
    try {
        const adminClient = getAdminDirectusClient();
        const client = adminClient || directus;

        booth = await client.request(
            readItems("Booths", {
                filter: { id: { _eq: boothId } },
                fields: ["*", { company: ["name", "id"], zone: ["*"] }],
                limit: 1,
            })
        ) as any[];
    } catch (e: any) {
        console.error("[DashboardOrderDrinks] Fetch failed.", e?.errors?.[0]?.message || e);
        booth = [{ id: boothId, booth_number: "?", company: undefined }];
    }

    if (!booth || booth.length === 0) {
        booth = [{ id: boothId, booth_number: "?" }];
    }

    const boothData = booth[0];
    const drinks = await listDrinks({ visible_only: true });

    let activeOrder = null;
    try {
        activeOrder = await getActiveOrderForBooth(boothId);
    } catch {
        console.log("Could not fetch active order permissions");
    }

    return (
        <div className="container mx-auto max-w-md py-8 px-4">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold">{boothData.company?.name || "Booth " + boothData.booth_number}</h1>
                <p className="text-muted-foreground">Booth #{boothData.booth_number}</p>
                <p className="text-sm font-bold mt-3">
                    Coffee will be prepared for you by our barista in the tent. Cava will be available at the bar starting from 15h00.
                </p>
            </div>

            <BoothClient
                boothId={boothId}
                companyId={boothData.company?.id}
                initialDrinks={drinks}
                initialActiveOrder={activeOrder}
            />
        </div>
    );
}
