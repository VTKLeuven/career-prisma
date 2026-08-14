import { Briefcase } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
import { isDevEnvironment } from "@/lib/dev-environment";

/**
 * The public job platform is a dev-only feature for now. On production the
 * routes stay reachable -- the header links to them from every page -- but they
 * show a placeholder instead of the real listings.
 */
export default function VacanciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isDevEnvironment()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-vtk-blue/5">
        <div className="mx-auto w-full max-w-7xl px-2 py-16 sm:px-4 sm:py-24">
          <ComingSoon
            title="Vacancies"
            description="The VTK Career job platform is still under construction. Soon you'll be able to browse internships, thesis topics and starter jobs from the companies at our events, and apply directly."
            icon={<Briefcase className="h-16 w-16 text-vtk-blue" />}
            backHref="/"
            backLabel="Back to Home"
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
