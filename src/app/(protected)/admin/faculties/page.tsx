import { getUserFromCookies } from "@/lib/auth-server";
import { listFaculties, listMasters } from "@/lib/repos/features";
import FacultiesClient from "./client";

export default async function AdminFacultiesPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const [faculties, masters] = await Promise.all([
    listFaculties({ limit: 200, sort: "name" }),
    listMasters({ limit: 500, sort: "name" }),
  ]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Faculties</h1>
        <p className="text-muted-foreground">
          Manage faculties and the master programmes assigned to each.
        </p>
      </div>
      <FacultiesClient initialFaculties={faculties ?? []} masters={masters ?? []} />
    </div>
  );
}
