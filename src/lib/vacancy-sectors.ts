import type { Vacancy, VacancySector } from "@/lib/schema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sectorFromJunctionRow(row: {
  sector_id?: string | VacancySector | null;
  vacancy_sectors_id?: string | VacancySector | null;
}): VacancySector | null {
  const sid = row.sector_id ?? row.vacancy_sectors_id;
  if (typeof sid === "object" && sid !== null && "id" in sid) {
    return sid as VacancySector;
  }
  // Directus often returns unexpanded M2O as a plain UUID string — still a valid sector link.
  if (typeof sid === "string" && UUID_RE.test(sid)) {
    return { id: sid, name: "", active: true };
  }
  return null;
}

/**
 * Sectors to show or filter: M2M `vacancies.sectors` when present, otherwise legacy M2O `sector`.
 * Supports both `sector_id` and Directus-default `vacancy_sectors_id` on the junction row.
 */
/** Label for UI when Directus returned a sector id without expanding `name`. */
export function vacancySectorDisplayName(s: VacancySector): string {
  return s.name?.trim() ? s.name : "Sector";
}

export function getVacancySectorsResolved(vacancy: Vacancy): VacancySector[] {
  const fromM2m =
    vacancy.sectors
      ?.map((row) =>
        typeof row === "string" ? null : sectorFromJunctionRow(row)
      )
      .filter((x): x is VacancySector => !!x) ?? [];

  const seen = new Set<string>();
  const deduped: VacancySector[] = [];
  for (const s of fromM2m) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    deduped.push(s);
  }
  if (deduped.length > 0) return deduped;

  if (typeof vacancy.sector === "object" && vacancy.sector?.id) {
    return [vacancy.sector as VacancySector];
  }
  return [];
}

export function vacancyMatchesSectorFilter(
  vacancy: Vacancy,
  sectorId: string
): boolean {
  return getVacancySectorsResolved(vacancy).some((s) => s.id === sectorId);
}
