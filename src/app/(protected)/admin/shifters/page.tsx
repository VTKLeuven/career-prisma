import { listAllUsersAction } from "@/app/actions/shifters";
import { Suspense } from "react";
import ShiftersClient from "./client";
import { getUserFromCookies } from "@/lib/auth-server";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminShiftersPage() {
    const user = await getUserFromCookies();
    if (!user?.admin) return <p>NO ACCESS</p>;

    const users = await listAllUsersAction();

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-6">
            <PageHeader title="Manage Shifters" description="Assign users who can manage orders." />
            <Suspense fallback={<div>Loading...</div>}>
                <ShiftersClient initialUsers={users} />
            </Suspense>
        </div>
    );
}
