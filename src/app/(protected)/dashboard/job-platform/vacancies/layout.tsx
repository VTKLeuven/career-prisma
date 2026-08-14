import { Briefcase } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
import { isDevEnvironment } from "@/lib/dev-environment";

/**
 * Covers the list, the new-vacancy form and the edit form in one place: this
 * layout wraps every route below /dashboard/job-platform/vacancies.
 */
export default function CompanyVacanciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isDevEnvironment()) {
    return (
      <ComingSoon
        title="Vacancies"
        description="Posting vacancies is still under development. Soon you'll be able to publish internships, thesis topics and job openings here, and students will find them on the public job platform."
        icon={<Briefcase className="h-16 w-16 text-vtk-blue" />}
      />
    );
  }

  return <>{children}</>;
}
