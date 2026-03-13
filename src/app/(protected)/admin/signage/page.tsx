import { Suspense } from "react";
import { getUserFromCookies } from "@/lib/auth-server";
import SignageClient from "./client";
import { fetchScreensAction, fetchMediaAction } from "@/app/actions/signage";

export default async function AdminSignagePage() {
    const user = await getUserFromCookies();
    if (!user?.admin) return <p>NO ACCESS</p>;

    const [screens, media] = await Promise.all([
        fetchScreensAction(),
        fetchMediaAction(),
    ]);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://career.vtk.be";

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Digital Signage</h1>
            </div>
            <Suspense fallback={<div>Loading...</div>}>
                <SignageClient
                    initialScreens={screens}
                    initialMedia={media}
                    baseUrl={baseUrl}
                />
            </Suspense>
        </div>
    );
}
