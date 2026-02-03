import { directus } from "@/lib/directus";
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
        booth = await directus.request(
            readItems("booths", {
                filter: { id: { _eq: id } },
                fields: ["*", { company: ["name", "id"], zone: ["*"] }],
                limit: 1
            })
        ) as any[];
    } catch (e) {
        console.error(e);
        return notFound();
    }

    if (!booth || booth.length === 0) {
        return notFound();
    }

    const boothData = booth[0];
    const drinks = await listDrinks({ visible_only: true });
    const activeOrder = await getActiveOrderForBooth(id);

    return (
        <div className="container mx-auto max-w-md py-8 px-4">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold">{boothData.company?.name || "Booth " + boothData.booth_number}</h1>
                <p className="text-muted-foreground">Booth #{boothData.booth_number}</p>
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
