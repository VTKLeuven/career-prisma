import { listZones } from "@/lib/repos/zones";
import { directus, getAdminDirectusClient } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import type { Booth } from "@/lib/schema";
import { Suspense } from "react";
import ZonesClient from "./client";

async function getBooths() {
    const client = await getAdminDirectusClient() || directus;
    return client.request(readItems("Booths", {
        fields: ["id", "booth_number", "Floorplan.name", "company.name"],
        sort: ["Floorplan.name", "booth_number"],
    })) as Promise<Booth[]>;
}

export default async function AdminZonesPage() {
    const [zones, booths] = await Promise.all([
        listZones(),
        getBooths(),
    ]);

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Zones & Booths</h1>
            </div>
            <Suspense fallback={<div>Loading...</div>}>
                <ZonesClient initialZones={zones} booths={booths} />
            </Suspense>
        </div>
    );
}
