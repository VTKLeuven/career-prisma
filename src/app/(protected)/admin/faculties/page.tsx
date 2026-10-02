import { getUserFromCookies } from "@/lib/auth-server";
import { listFaculties, listMasters } from "@/lib/repos/features";
import FacultiesClient from "./client";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminFacultiesPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const [faculties, masters] = await Promise.all([
    listFaculties({ limit: 200, sort: "name" }),
    listMasters({ limit: 500, sort: "name" }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Faculties" description="Manage faculties and the master programmes assigned to each." />
      <FacultiesClient initialFaculties={faculties ?? []} masters={masters ?? []} />
    </div>
  );
}
