import { canUseCompanyVacancyPages } from "../access";
import { loadVacancyFormOptions } from "../form-options";
import { VacancyEditor } from "../vacancy-editor";

export default async function NewVacancyPage() {
  // Without the vacancy grant the layout explains why; load nothing then.
  if (!(await canUseCompanyVacancyPages())) return null;
  return <VacancyEditor {...await loadVacancyFormOptions()} />;
}
