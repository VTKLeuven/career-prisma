/**
 * General info options for student/company matching.
 * Keys must match between student and company for overlap scoring.
 */
export const GENERAL_INFO_WORK_PREFERENCE_OPTIONS = [
  { key: "multidisciplined_team", label: "In a multidisciplined team", keyword: "Multidisciplinary team" },
  { key: "fellow_engineers", label: "With fellow engineers", keyword: "Fellow engineers" },
  { key: "individually", label: "Individually", keyword: "Individual work" },
  { key: "multiple_smaller_projects", label: "On multiple smaller projects", keyword: "Small projects" },
  { key: "one_large_project", label: "On one large project", keyword: "Large projects" },
] as const;

export const GENERAL_INFO_COMPANY_TYPE_OPTIONS = [
  { key: "startup", label: "Startup", keyword: "Startup" },
  { key: "small_to_medium_business", label: "Small to medium business", keyword: "Small/medium business" },
  { key: "multinational", label: "Multinational", keyword: "Multinational" },
  { key: "brand_awareness", label: "Company with a lot of brand awareness", keyword: "Brand awareness" },
  { key: "international_institution", label: "International institution", keyword: "International institution" },
  { key: "government_organisation", label: "Government organisation", keyword: "Government sector" },
  { key: "university_spinoff", label: "University spinoff", keyword: "University spinoff" },
  { key: "belgian_company", label: "Belgian company", keyword: "Belgian company" },
] as const;

export const GENERAL_INFO_WORK_OPTIONS = [
  { key: "work_from_home", label: "Work from home", keyword: "Remote work" },
  { key: "flexible_schedule", label: "Have a flexible work schedule", keyword: "Flexible schedule" },
  { key: "travel_abroad", label: "Travel abroad for work", keyword: "Travel abroad" },
  { key: "live_abroad", label: "Live abroad for work", keyword: "Work abroad" },
] as const;

export type GeneralInfoAnswers = {
  work_preference: string[];
  company_preference?: string[]; // student only
  company_type?: string[]; // company only
  options_preference?: string[]; // student only
  work_options?: string[]; // company only
};

/**
 * Compute general info match score for student–company matching.
 * Returns an average in [-1, 1] (percentage-like, comparable to OCIA scale). Met counts 2× vs not met.
 * - Company offers X and student has X indicated → positive (good match)
 * - Company offers X and student hasn't indicated X → negative (bad match)
 * - All other cases (student has X but company doesn't, empty, etc.) → neutral (no effect)
 */
export function countGeneralInfoOverlap(
  student: GeneralInfoAnswers,
  company: GeneralInfoAnswers
): number {
  const workScore = preferenceMatchScore(
    company.work_preference ?? [],
    student.work_preference ?? []
  );
  const companyScore = preferenceMatchScore(
    company.company_type ?? [],
    student.company_preference ?? []
  );
  const optionsScore = preferenceMatchScore(
    company.work_options ?? [],
    student.options_preference ?? []
  );
  return (workScore + 2 * companyScore + optionsScore) / 4;
}

/** Get labels for options that overlap: company offers X and student has X indicated. */
export function getGeneralInfoOverlapLabels(
  student: GeneralInfoAnswers,
  company: GeneralInfoAnswers
): string[] {
  return getGeneralInfoOverlapKeywords(student, company);
}

/** Get short keywords for overlap display (standalone, make sense without full sentence). At most one per category. */
export function getGeneralInfoOverlapKeywords(
  student: GeneralInfoAnswers,
  company: GeneralInfoAnswers
): string[] {
  const workOverlap = getOverlapKeywords(
    company.work_preference ?? [],
    student.work_preference ?? [],
    GENERAL_INFO_WORK_PREFERENCE_OPTIONS
  );
  const companyOverlap = getOverlapKeywords(
    company.company_type ?? [],
    student.company_preference ?? [],
    GENERAL_INFO_COMPANY_TYPE_OPTIONS
  );
  const optionsOverlap = getOverlapKeywords(
    company.work_options ?? [],
    student.options_preference ?? [],
    GENERAL_INFO_WORK_OPTIONS
  );
  const pickOne = (arr: string[]) =>
    arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : undefined;
  return [pickOne(workOverlap), pickOne(companyOverlap), pickOne(optionsOverlap)].filter(
    (x): x is string => typeof x === "string"
  );
}

function getOverlapKeywords(
  companyOffers: string[],
  studentPrefs: string[],
  options: readonly { key: string; label: string; keyword?: string }[]
): string[] {
  const setStudent = new Set(studentPrefs);
  const keyToKeyword = Object.fromEntries(
    options.map((o) => [o.key, o.keyword ?? o.label])
  );
  return companyOffers
    .filter((key) => setStudent.has(key))
    .map((key) => keyToKeyword[key])
    .filter(Boolean);
}

/** For each company option: student has it → met, else → notMet. (2*met - notMet) / total, normalized to [-1, 1]. Empty company = 0. */
function preferenceMatchScore(companyOffers: string[], studentPrefs: string[]): number {
  if (companyOffers.length === 0) return 0;
  const setStudent = new Set(studentPrefs);
  const met = companyOffers.filter((x) => setStudent.has(x)).length;
  const notMet = companyOffers.length - met;
  const raw = (2 * met - notMet) / companyOffers.length; // range [-1, 2]
  return (2 * raw - 1) / 3; // normalize to [-1, 1]
}
