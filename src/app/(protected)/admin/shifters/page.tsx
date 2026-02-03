import { listAllUsersAction } from "@/app/actions/shifters";
import { Suspense } from "react";
import ShiftersClient from "./client";

export default async function AdminShiftersPage() {
    const users = await listAllUsersAction();

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Manage Shifters</h1>
            </div>
            <p className="text-muted-foreground">
                Assign users who can manage orders.
            </p>
            <Suspense fallback={<div>Loading...</div>}>
                <ShiftersClient initialUsers={users} />
            </Suspense>
        </div>
    );
}
