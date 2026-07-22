import { getUserFromCookies } from "@/lib/auth-server";
import { listAcademicYearsForAdmin } from "@/lib/repos/academic-year";
import AcademicYearsClient from "./client";

export default async function AdminAcademicYearsPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;
  const years = await listAcademicYearsForAdmin();

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">Academic Years</h1>
        <p className="text-muted-foreground">
          These date ranges determine which event editions and company purchases are current.
          Periods may have gaps, but they cannot overlap.
        </p>
      </div>
      <AcademicYearsClient initialYears={years} />
    </div>
  );
}
