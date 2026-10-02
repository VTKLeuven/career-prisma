import { listZones } from "@/lib/repos/zones";
import type { Booth } from "@/lib/schema";
import { Suspense } from "react";
import ZonesClient from "./client";
import { getUserFromCookies } from "@/lib/auth-server";
import { fetchEventPagesAction } from "@/app/actions/events";
import type { CareerEventPage } from "@/lib/schema";
import prisma from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";

async function getBooths() {
    const rows = await prisma.booth.findMany({
        include: { floorplan: true, company: true },
        orderBy: { booth_number: "asc" },
    });
    return rows.map(({ floorplan, floorplan_id, company_id, ...row }) => ({
        ...row,
        id: String(row.id),
        Floorplan: floorplan,
        company: row.company,
    })) as unknown as Booth[];
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
        <div className="mx-auto w-full max-w-[1600px] space-y-6">
            <PageHeader title="Zones & Booths" />
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
