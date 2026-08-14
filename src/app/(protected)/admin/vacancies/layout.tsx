import { Briefcase } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
import { isDevEnvironment } from "@/lib/dev-environment";

/**
 * Admins are gated too. The point of the flag is that production and dev look
 * different to whoever is clicking around, and an admin browsing production
 * should see what everyone else sees.
 */
export default function AdminVacanciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isDevEnvironment()) {
    return (
      <ComingSoon
        title="Vacancies"
        description="Vacancy administration is only available on the development site while the job platform is being built. Switch to dev.career.vtk.be to try it out."
        icon={<Briefcase className="h-16 w-16 text-vtk-blue" />}
        backHref="/admin"
        backLabel="Back to Admin Panel"
      />
    );
  }

  return <>{children}</>;
}
