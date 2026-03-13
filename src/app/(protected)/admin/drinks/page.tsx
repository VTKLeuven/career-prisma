import { listDrinks } from "@/lib/repos/drinks";
import { getOrderingSettings } from "@/lib/repos/ordering-settings";
import { listEvents } from "@/lib/repos/event";
import { Suspense } from "react";
import DrinksClient from "./client";
import { getUserFromCookies } from "@/lib/auth-server";

export default async function AdminDrinksPage() {
    const user = await getUserFromCookies();
    if (!user?.admin) return <p>NO ACCESS</p>;

    const [drinks, orderingSettings, events] = await Promise.all([
        listDrinks(),
        getOrderingSettings(),
        listEvents(),
    ]);

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Drinks & Snacks</h1>
            </div>
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
