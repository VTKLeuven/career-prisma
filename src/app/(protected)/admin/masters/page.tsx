import { getUserFromCookies } from "@/lib/auth-server";
import { listMasters } from "@/lib/repos/features";
import MastersClient from "./client";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminMastersPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const masters = (await listMasters({ limit: 500, sort: "name" })) ?? [];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Master Categories" description="Manage the master programmes shown across the platform." />
      <MastersClient initialMasters={masters} />
    </div>
  );
}
