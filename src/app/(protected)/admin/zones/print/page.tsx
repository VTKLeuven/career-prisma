import Link from "next/link";
import { getEventPageById } from "@/lib/repos/event";
import { getBoothsForFloorplan } from "@/lib/repos/floorplan";
import PrintClient from "./client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function PrintQRCodesPage({
    searchParams,
}: {
    searchParams: Promise<{ eventPageId?: string }>;
}) {
    const params = await searchParams;
    const eventPageId = params?.eventPageId;

    if (!eventPageId) {
        return (
            <div className="container mx-auto py-6 space-y-4">
                <p className="text-muted-foreground">
                    Please select a career event page on the Zones & Booths page first.
                </p>
                <Button variant="outline" asChild>
                    <Link href="/admin/zones">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Zones & Booths
                    </Link>
                </Button>
            </div>
        );
    }

    const eventPage = await getEventPageById(eventPageId);
    const floorplanId =
        eventPage?.floorplan && typeof eventPage.floorplan === "object" && eventPage.floorplan?.id
            ? eventPage.floorplan.id
            : typeof eventPage?.floorplan === "string"
              ? eventPage.floorplan
              : null;

    if (!floorplanId) {
        return (
            <div className="container mx-auto py-6 space-y-4">
                <p className="text-muted-foreground">
                    The selected event page has no floorplan assigned.
                </p>
                <Button variant="outline" asChild>
                    <Link href="/admin/zones">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Zones & Booths
                    </Link>
                </Button>
            </div>
        );
    }

    const booths = await getBoothsForFloorplan(floorplanId);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://career.vtk.be";

    return (
        <PrintClient
            booths={booths}
            baseUrl={baseUrl}
            eventPageName={(eventPage?.event as { name?: string })?.name}
            floorplanName={(eventPage?.floorplan as { name?: string })?.name}
        />
    );
}
