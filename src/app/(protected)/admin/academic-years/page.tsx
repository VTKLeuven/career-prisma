import { getUserFromCookies } from "@/lib/auth-server";
import { listAcademicYearsForAdmin } from "@/lib/repos/academic-year";
import AcademicYearsClient from "./client";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminAcademicYearsPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;
  const years = await listAcademicYearsForAdmin();

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Academic Years" description="These date ranges determine which event editions and company purchases are current. Periods may have gaps, but they cannot overlap." />
      <AcademicYearsClient initialYears={years} />
    </div>
  );
}
