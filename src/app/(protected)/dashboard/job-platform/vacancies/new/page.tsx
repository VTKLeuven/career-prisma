import { isDevEnvironment } from "@/lib/dev-environment";
import { loadVacancyFormOptions } from "../form-options";
import { VacancyEditor } from "../vacancy-editor";

export default async function NewVacancyPage() {
  // The vacancies layout shows "coming soon" outside dev; nothing to load then.
  if (!isDevEnvironment()) return null;
  return <VacancyEditor {...await loadVacancyFormOptions()} />;
}
