import "server-only";

import { getUserFromCookies } from "@/lib/auth-server";
import { hasGrant } from "@/lib/utils/company-access";

/**
 * Whether the signed-in user may use the company vacancy pages: an admin, or
 * a company holding the vacancy-platform grant this academic year
 * (lib/grants.ts). The same rule as fetchVacancyAccessAction() and the write
 * actions in app/actions/vacancies.ts, which check again for themselves.
 *
 * There is no middleware, and Next renders a layout and its page side by
 * side -- a layout that withholds `children` does not stop the page from
 * running. So the layout uses this to show the "not in your package" notice,
 * and every page below it calls it too before loading anything.
 */
export async function canUseCompanyVacancyPages(): Promise<boolean> {
  const user = await getUserFromCookies();
  if (!user) return false;
  return Boolean(user.admin || hasGrant(user.company, "vacancies"));
}
