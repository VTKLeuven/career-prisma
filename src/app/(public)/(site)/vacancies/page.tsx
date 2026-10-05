import {
  fetchPublicVacanciesAction,
  fetchVacancyTypesAction,
  fetchVacancySectorsAction,
} from "@/app/actions/vacancies";
import { loadPublicMasters } from "@/lib/masters-data";
import { VacanciesClient } from "./vacancies-client";

export const metadata = { title: "Vacancies" };

/**
 * /vacancies: published vacancies with their filters. Loaded here, in
 * parallel -- the page used to fetch the four lists from the browser as
 * server actions, which Next runs one after another.
 */
export default async function VacanciesPage() {
  const [vacancies, types, sectors, masters] = await Promise.all([
    fetchPublicVacanciesAction(),
    fetchVacancyTypesAction(),
    fetchVacancySectorsAction(),
    loadPublicMasters(),
  ]);
  return (
    <VacanciesClient
      vacancies={vacancies ?? []}
      types={types ?? []}
      sectors={sectors ?? []}
      masters={masters ?? []}
    />
  );
}
