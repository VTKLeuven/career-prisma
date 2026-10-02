import { Suspense } from "react";
import { getUserFromCookies } from "@/lib/auth-server";
import SignageClient from "./client";
import { fetchScreensAction, fetchMediaAction } from "@/app/actions/signage";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminSignagePage() {
    const user = await getUserFromCookies();
    if (!user?.admin) return <p>NO ACCESS</p>;

    const [screens, media] = await Promise.all([
        fetchScreensAction(),
        fetchMediaAction(),
    ]);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://career.vtk.be";

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-6">
            <PageHeader title="Digital Signage" />
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
