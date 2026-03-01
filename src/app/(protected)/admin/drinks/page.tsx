import { listDrinks } from "@/lib/repos/drinks";
import { getCompanyOrderingEnabled } from "@/lib/repos/ordering-settings";
import { Suspense } from "react";
import DrinksClient from "./client";
import { getUserFromCookies } from "@/lib/auth-server";

export default async function AdminDrinksPage() {
    const user = await getUserFromCookies();
    if (!user?.admin) return <p>NO ACCESS</p>;

    const [drinks, companyOrderingEnabled] = await Promise.all([
        listDrinks(),
        getCompanyOrderingEnabled(),
    ]);

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Drinks & Snacks</h1>
            </div>
            <Suspense fallback={<div>Loading...</div>}>
                <DrinksClient initialDrinks={drinks} initialCompanyOrderingEnabled={companyOrderingEnabled} />
            </Suspense>
        </div>
    );
}
