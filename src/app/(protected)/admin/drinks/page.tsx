import { listDrinks } from "@/lib/repos/drinks";
import { getOrderingSettings } from "@/lib/repos/ordering-settings";
import { listEvents } from "@/lib/repos/event";
import { Suspense } from "react";
import DrinksClient from "./client";
import { getUserFromCookies } from "@/lib/auth-server";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminDrinksPage() {
    const user = await getUserFromCookies();
    if (!user?.admin) return <p>NO ACCESS</p>;

    const [drinks, orderingSettings, events] = await Promise.all([
        listDrinks(),
        getOrderingSettings(),
        listEvents(),
    ]);

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-6">
            <PageHeader title="Drinks & Snacks" />
            <Suspense fallback={<div>Loading...</div>}>
                <DrinksClient
                    initialDrinks={drinks}
                    initialCompanyOrderingEnabled={orderingSettings.enabled}
                    initialActiveEventId={orderingSettings.activeEventId}
                    events={events}
                />
            </Suspense>
        </div>
    );
}
