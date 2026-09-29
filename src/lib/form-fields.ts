// lib/form-fields.ts — helpers shared by the form builder, the public form
// pages and the responses page. Client-safe: no server-only imports.

import type { FormField } from "@/lib/schema";
import {
  STUDY_PROGRAMMES,
  STUDY_YEARS,
  labelForProgramme,
  labelForYear,
} from "@/lib/study-options";

/**
 * The name to show for a field wherever a column header or an error message
 * needs one. A field's title (label) is optional — several untitled inputs can
 * sit under one titled field, like "Representative names" followed by one
 * input per name — so fall back to the placeholder, then the field id.
 */
export function fieldDisplayLabel(field: Pick<FormField, "label" | "placeholder" | "name">): string {
  return field.label?.trim() || field.placeholder?.trim() || field.name;
}

/**
 * Study fields store the English label, not the SSO enum value, so responses
 * read the same as any other select/checkbox answer in the table, the CSV
 * export and the CV book — none of which know about study-options.ts.
 */
export function studyFieldOptions(type: "study-programme" | "study-year"): string[] {
  return (type === "study-programme" ? STUDY_PROGRAMMES : STUDY_YEARS).map((o) => o.labelEn);
}

/**
 * The answer a study field starts with for a signed-in student, from their
 * `study_programmes` / `study_years`. Values the options do not list (an enum
 * the SSO added after study-options.ts was last synced) are dropped: a
 * checkbox group could not show them, so they would be submitted invisibly.
 * Returns undefined when there is nothing to prefill.
 */
export function studyFieldPrefill(
  field: FormField,
  student: { study_programmes: string[]; study_years: string[] },
): string | string[] | undefined {
  if (field.type !== "study-programme" && field.type !== "study-year") return undefined;
  const options = studyFieldOptions(field.type);
  const labels = (field.type === "study-programme" ? student.study_programmes : student.study_years)
    .map(field.type === "study-programme" ? labelForProgramme : labelForYear)
    .filter((label) => options.includes(label));
  if (labels.length === 0) return undefined;
  return field.multiple ? labels : labels[0];
}
