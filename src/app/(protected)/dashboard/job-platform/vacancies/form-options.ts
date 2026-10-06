import "server-only";

import {
  fetchVacancySectionConfigsAction,
  fetchVacancySectorsAction,
  fetchVacancyTypesAction,
} from "@/app/actions/vacancies";
import { fetchMastersAction } from "@/app/actions/features";
import type { VacancyFormOptions } from "./vacancy-editor";

/**
 * The pick lists of the vacancy form, loaded in parallel on the server. The
 * pages used to fetch them through four or five server actions on mount,
 * which Next runs one at a time.
 */
export async function loadVacancyFormOptions(): Promise<VacancyFormOptions> {
  const [types, sectors, sectionConfigs, masters] = await Promise.all([
    fetchVacancyTypesAction(),
    fetchVacancySectorsAction(),
    fetchVacancySectionConfigsAction(),
    fetchMastersAction(),
  ]);
  return { types: types ?? [], sectors: sectors ?? [], sectionConfigs: sectionConfigs ?? [], masters: masters ?? [] };
}
