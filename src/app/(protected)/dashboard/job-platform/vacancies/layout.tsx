import { canUseCompanyVacancyPages } from "./access";

/**
 * Covers the list, the new-vacancy form and the edit form in one place: this
 * layout wraps every route below /dashboard/job-platform/vacancies.
 *
 * Until BR-24 this showed "coming soon" outside DEV_ENVIRONMENT. The company
 * side is live now, so the only gate is the vacancy-platform grant: a company
 * without it sees why instead of a form whose save would be refused. Each page
 * checks again (see ./access.ts), because this layout cannot stop one from
 * rendering.
 */
export default async function CompanyVacanciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await canUseCompanyVacancyPages())) {
    return (
      <div className="space-y-2 rounded-lg border p-6 text-center">
        <h2 className="text-xl font-semibold">Vacancy platform</h2>
        <p className="text-muted-foreground">
          Posting vacancies is not part of your company&apos;s package this year. Contact your
          VTK salesperson to add it.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
