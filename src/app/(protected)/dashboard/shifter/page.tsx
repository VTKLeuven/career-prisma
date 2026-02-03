import { listZones } from "@/lib/repos/zones";
import { getUserFromCookies } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import ShifterDashboardClient from "./client";

export default async function ShifterPage() {
    const user = await getUserFromCookies();
    if (!user) redirect("/login");

    if (!user.is_shifter && !user.admin) {
        return <div>Access Denied. You are not a registered shifter.</div>;
    }

    const zones = await listZones();

    return (
        <div className="container mx-auto py-6 space-y-6">
            <h1 className="text-3xl font-bold">Shifter Dashboard</h1>
            <ShifterDashboardClient
                initialZones={zones}
                currentUserId={user.id}
            />
        </div>
    );
}
