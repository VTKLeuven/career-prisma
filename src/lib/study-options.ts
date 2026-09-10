// lib/study-options.ts — the vocabulary for `students.study_programmes` and
// `students.study_years`.
//
// These MUST stay in step with the `StudyProgramme` and `StudyYear` enums on
// the VTK site (`prisma/schema.prisma`, the enums the SSO's `vtk:study_years`
// and `vtk:study_programmes` claims are built from). The SSO sends lowercased
// enum values — "computer_science", "master_1" — and the onboarding form
// writes into the same columns, so if the two lists drift, one student's
// programme stops matching another's for no visible reason.
//
// The labels are ours; only the values have to match.

export interface StudyOption {
  /** The SSO's lowercased enum value. Do not invent new ones here. */
  value: string;
  labelNl: string;
  labelEn: string;
}

/**
 * Members outside FIRW pick from this list too, which is why it ends in an
 * "other" entry: their programme is by definition not one of the faculty's.
 */
export const STUDY_PROGRAMMES: StudyOption[] = [
  { value: "computer_science", labelNl: "Computerwetenschappen", labelEn: "Computer Science" },
  { value: "cybersecurity", labelNl: "Cybersecurity", labelEn: "Cybersecurity" },
  { value: "other", labelNl: "Andere", labelEn: "Other" },
];

export const STUDY_YEARS: StudyOption[] = [
  { value: "bachelor_1", labelNl: "1e bachelor", labelEn: "1st Bachelor" },
  { value: "bachelor_2", labelNl: "2e bachelor", labelEn: "2nd Bachelor" },
  { value: "bachelor_3", labelNl: "3e bachelor", labelEn: "3rd Bachelor" },
  { value: "master_1", labelNl: "1e master", labelEn: "1st Master" },
  { value: "master_2", labelNl: "2e master", labelEn: "2nd Master" },
  { value: "other", labelNl: "Andere", labelEn: "Other" },
];

const PROGRAMME_VALUES = new Set(STUDY_PROGRAMMES.map((o) => o.value));
const YEAR_VALUES = new Set(STUDY_YEARS.map((o) => o.value));

/**
 * Keeps only values this app recognises. The SSO's own claims are NOT filtered
 * through this — it may know enum values we have not listed yet, and dropping
 * them would be worse than storing them. This exists for the onboarding form,
 * where the input comes from the browser.
 */
export function filterProgrammes(values: string[]): string[] {
  return [...new Set(values.filter((v) => PROGRAMME_VALUES.has(v)))];
}

export function filterYears(values: string[]): string[] {
  return [...new Set(values.filter((v) => YEAR_VALUES.has(v)))];
}

/** Display text for a stored value, falling back to a readable form of it. */
export function labelForProgramme(value: string): string {
  return (
    STUDY_PROGRAMMES.find((o) => o.value === value)?.labelEn ?? humanize(value)
  );
}

export function labelForYear(value: string): string {
  return STUDY_YEARS.find((o) => o.value === value)?.labelEn ?? humanize(value);
}

function humanize(value: string): string {
  const words = value.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
