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
// The labels are vtk.be's too, so a student sees the same words on both sites.

export interface StudyOption {
  /** The SSO's lowercased enum value. Do not invent new ones here (`other` is the one exception). */
  value: string;
  labelNl: string;
  labelEn: string;
}

/**
 * Copied from the vtk.be repo (`packages/db/prisma/schema.prisma:437-467`,
 * labels from `packages/i18n/src/messages/{nl,en}.json:377-402`), in the order
 * vtk.be shows them. Checked 29 Sep 2026 — see `career-sso-answers.md`.
 *
 * The one value that is NOT the SSO's is `other`, at the end of each list. The
 * SSO has no such value: members outside FIRW, alumni and staff simply arrive
 * with an empty array, and the onboarding form needs something for them to
 * pick. It only ever comes from that form, never from a claim.
 */
export const STUDY_PROGRAMMES: StudyOption[] = [
  { value: "architecture", labelNl: "Architectuur", labelEn: "Architecture" },
  { value: "biomedical", labelNl: "Biomedische Technologie", labelEn: "Biomedical Engineering" },
  { value: "common_bachelor", labelNl: "Algemene Bachelor", labelEn: "Common Bachelor" },
  { value: "civil", labelNl: "Bouwkunde", labelEn: "Civil Engineering" },
  { value: "chemical", labelNl: "Chemische Ingenieurstechnieken", labelEn: "Chemical Engineering" },
  { value: "computer_science", labelNl: "Computerwetenschappen", labelEn: "Computer Science" },
  { value: "cybersecurity", labelNl: "Cybersecurity", labelEn: "Cybersecurity" },
  { value: "digital_humanities", labelNl: "Digital Humanities", labelEn: "Digital Humanities" },
  { value: "electrical", labelNl: "Elektrotechniek", labelEn: "Electrical Engineering" },
  { value: "energy", labelNl: "Energie", labelEn: "Energy Engineering" },
  {
    value: "artificial_intelligence",
    labelNl: "Artificiële Intelligentie (ir.)",
    labelEn: "Artificial Intelligence (ir.)",
  },
  { value: "materials", labelNl: "Materiaalkunde", labelEn: "Materials Engineering" },
  { value: "mobility_supply_chain", labelNl: "Mobility & Supply Chain", labelEn: "Mobility & Supply Chain" },
  { value: "nano", labelNl: "Nanowetenschappen", labelEn: "Nano engineering" },
  {
    value: "urbanism",
    labelNl: "Urbanism Landscape and Planning",
    labelEn: "Urbanism Landscape and Planning",
  },
  { value: "mathematical", labelNl: "Wiskundige Ingenieurstechnieken", labelEn: "Mathematical Engineering" },
  { value: "mechanical", labelNl: "Werktuigkunde", labelEn: "Mechanical Engineering" },
  { value: "other", labelNl: "Andere", labelEn: "Other" },
];

export const STUDY_YEARS: StudyOption[] = [
  { value: "bachelor_1", labelNl: "1ste bachelor", labelEn: "1st bachelor" },
  { value: "bachelor_2", labelNl: "2de bachelor", labelEn: "2nd bachelor" },
  { value: "bachelor_3", labelNl: "3de bachelor", labelEn: "3rd bachelor" },
  { value: "master_1", labelNl: "1ste master", labelEn: "1st master" },
  { value: "master_2", labelNl: "2de master", labelEn: "2nd master" },
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
