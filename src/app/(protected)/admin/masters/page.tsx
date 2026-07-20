import { getUserFromCookies } from "@/lib/auth-server";
import { listMasters } from "@/lib/repos/features";
import MastersClient from "./client";

export default async function AdminMastersPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const masters = (await listMasters({ limit: 500, sort: "name" })) ?? [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Master Categories</h1>
        <p className="text-muted-foreground">
          Manage the master programmes shown across the platform.
        </p>
      </div>
      <MastersClient initialMasters={masters} />
    </div>
  );
}
