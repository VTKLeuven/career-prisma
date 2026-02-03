import { directus, getAdminDirectusClient } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import type { Booth } from "@/lib/schema";
import PrintClient from "./client";

async function getBooths() {
    const client = await getAdminDirectusClient() || directus;
    return client.request(readItems("Booths", {
        fields: ["id", "booth_number", "Floorplan.name", "company.name", "company.id"],
        sort: ["Floorplan.name", "booth_number"],
    })) as Promise<Booth[]>;
}

export default async function PrintQRCodesPage() {
    const booths = await getBooths();

    // Base URL for QR codes
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://career.vtk.be"; // Fallback URL

    return <PrintClient booths={booths} baseUrl={baseUrl} />;
}
