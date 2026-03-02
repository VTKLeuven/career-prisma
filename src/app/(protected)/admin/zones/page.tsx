import { listZones } from "@/lib/repos/zones";
import { directus, getAdminDirectusClient, getDirectusWithToken } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import type { Booth } from "@/lib/schema";
import { Suspense } from "react";
import ZonesClient from "./client";
import { getUserFromCookies } from "@/lib/auth-server";
import { fetchEventPagesAction } from "@/app/actions/events";
import type { CareerEventPage } from "@/lib/schema";

async function getBooths() {
    const client = await getDirectusWithToken() || await getAdminDirectusClient() || directus;
    return client.request(readItems("Booths", {
        fields: ["id", "booth_number", "Floorplan.name", "Floorplan.id", "company.name"] as any,
        sort: ["Floorplan.name", "booth_number"] as any,
    })) as unknown as Promise<Booth[]>;
}

export default async function AdminZonesPage() {
    const user = await getUserFromCookies();
    if (!user?.admin) return <p>NO ACCESS</p>;

    const [eventPages, zones, booths] = await Promise.all([
        fetchEventPagesAction(100),
        listZones(),
        getBooths(),
    ]);

    const eventPagesWithFloorplan = (eventPages ?? []).filter(
        (p: CareerEventPage) => p.floorplan && (typeof p.floorplan === "object" ? p.floorplan.id : p.floorplan)
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://career.vtk.be";

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Zones & Booths</h1>
            </div>
            <Suspense fallback={<div>Loading...</div>}>
                <ZonesClient
                    initialZones={zones}
                    booths={booths}
                    baseUrl={baseUrl}
                    careerEventPages={eventPagesWithFloorplan}
                />
            </Suspense>
        </div>
    );
}
