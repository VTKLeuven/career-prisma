import { notFound } from "next/navigation";
import BoothClient from "./client";
import { listDrinks } from "@/lib/repos/drinks";
import { getActiveOrderForBooth } from "@/lib/repos/orders";
import prisma from "@/lib/prisma";

export default async function BoothPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Fetch Booth details
    // Assuming booth ID is passed, OR booth number if slug?
    // User said "Each booth should get their own QR code". Direct link `booth/[id]`.

    const boothData = await prisma.booth.findUnique({
        where: { id: Number(id) },
        include: { company: true, floorplan: true },
    });
    if (!boothData) notFound();
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
                <p className="text-sm font-bold mt-3">
                    Coffee will be prepared for you by our barista in the tent. Cava will be available at the bar starting from 15h00.
                </p>
            </div>

            <BoothClient
                boothId={id}
                companyId={boothData.company?.id ?? ""}
                initialDrinks={drinks}
                initialActiveOrder={activeOrder}
            />
        </div>
    );
}
