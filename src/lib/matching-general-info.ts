/**
 * General info options for student/company matching.
 * Keys must match between student and company for overlap scoring.
 */
export const GENERAL_INFO_WORK_PREFERENCE_OPTIONS = [
  { key: "multidisciplined_team", label: "In a multidisciplined team" },
  { key: "fellow_engineers", label: "With fellow engineers" },
  { key: "individually", label: "Individually" },
  { key: "multiple_smaller_projects", label: "On multiple smaller projects" },
  { key: "one_large_project", label: "On one large project" },
] as const;

export const GENERAL_INFO_COMPANY_TYPE_OPTIONS = [
  { key: "startup", label: "Startup" },
  { key: "small_to_medium_business", label: "Small to medium business" },
  { key: "multinational", label: "Multinational" },
  { key: "brand_awareness", label: "Company with a lot of brand awareness" },
  { key: "international_institution", label: "International institution" },
  { key: "government_organisation", label: "Government organisation" },
  { key: "university_spinoff", label: "University spinoff" },
  { key: "belgian_company", label: "Belgian company" },
] as const;

export const GENERAL_INFO_WORK_OPTIONS = [
  { key: "work_from_home", label: "Work from home" },
  { key: "flexible_schedule", label: "Have a flexible work schedule" },
  { key: "travel_abroad", label: "Travel abroad for work" },
  { key: "live_abroad", label: "Live abroad for work" },
] as const;

export type GeneralInfoAnswers = {
  work_preference: string[];
  company_preference?: string[]; // student only
  company_type?: string[]; // company only
  options_preference?: string[]; // student only
  work_options?: string[]; // company only
};

/** Count overlapping options across all three question pairs for matching. */
export function countGeneralInfoOverlap(
  student: GeneralInfoAnswers,
  company: GeneralInfoAnswers
): number {
  const workOverlap = countOverlap(
    student.work_preference ?? [],
    company.work_preference ?? []
  );
  const companyOverlap = countOverlap(
    student.company_preference ?? [],
    company.company_type ?? []
  );
  const optionsOverlap = countOverlap(
    student.options_preference ?? [],
    company.work_options ?? []
  );
  return workOverlap + companyOverlap + optionsOverlap;
}

function countOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x)).length;
}
