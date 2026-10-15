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
 *
 * `study-programme` is retired: the builder no longer offers it, because
 * master-degrees fields now prefill from the masters linked to a programme.
 * It still renders for the forms that already use it.
 */
export function studyFieldOptions(type: "study-programme" | "study-year"): string[] {
  return (type === "study-programme" ? STUDY_PROGRAMMES : STUDY_YEARS).map((o) => o.labelEn);
}

/**
 * A signed-in student's study info. `master_ids` / `faculty_ids` are what they
 * study, already resolved by `studentStudyIds()` (src/lib/study-choices.ts):
 * their own choice, or the masters linked to their vtk.be programmes.
 */
export type StudentStudy = {
  study_programmes: string[];
  study_years: string[];
  master_ids: string[];
  faculty_ids: string[];
};

/** The bits of a faculty the prefill needs — it comes from repos/features. */
export type PrefillFaculty = {
  id: string | number;
  masters?: Array<{ master_id: { id: string | number } | string | number | null }>;
};

/**
 * The answer a study-year (or retired study-programme) field starts with for a
 * signed-in student. Values the options do not list (an enum the SSO added
 * after study-options.ts was last synced) are dropped: a checkbox group could
 * not show them, so they would be submitted invisibly.
 */
function studyFieldPrefill(field: FormField, student: StudentStudy): string | string[] | undefined {
  if (field.type !== "study-programme" && field.type !== "study-year") return undefined;
  const options = studyFieldOptions(field.type);
  const labels = (field.type === "study-programme" ? student.study_programmes : student.study_years)
    .map(field.type === "study-programme" ? labelForProgramme : labelForYear)
    .filter((label) => options.includes(label));
  if (labels.length === 0) return undefined;
  return field.multiple ? labels : labels[0];
}

/**
 * The masters a master-degrees field starts with for a signed-in student: the
 * masters (and faculties without masters) they study, see `StudentStudy`.
 * Values are in the field's own option format — the master id, or
 * `fac:<faculty>:<master>` / `fac:<faculty>` when the field groups by faculty
 * — or the select would not recognise them. A field without faculties has no
 * option for a faculty, so a faculty choice only prefills the grouped kind.
 *
 * A single-choice field is only prefilled when exactly one value matches;
 * guessing between two would look like the student had chosen. Students who
 * have not said what they study get nothing and pick themselves.
 */
function masterDegreesPrefill(
  field: FormField,
  student: StudentStudy,
  faculties: PrefillFaculty[],
): string | string[] | undefined {
  if (field.type !== "master-degrees") return undefined;
  const masterIds = student.master_ids;

  let values: string[];
  if (field.masterDegreesIncludeFaculties) {
    // Same shape as the options FormFieldRenderer builds. A master listed under
    // several faculties is prefilled under the first one only.
    values = [];
    for (const id of masterIds) {
      const faculty = faculties.find((f) =>
        (f.masters ?? []).some((item) => {
          const mid = item?.master_id;
          return String(mid && typeof mid === "object" ? mid.id : mid) === id;
        }),
      );
      if (faculty) values.push(`fac:${faculty.id}:${id}`);
    }
    for (const id of student.faculty_ids) {
      const faculty = faculties.find((f) => String(f.id) === id);
      if (faculty && !(faculty.masters ?? []).length) values.push(`fac:${faculty.id}`);
    }
  } else {
    values = masterIds;
  }

  if (values.length === 0) return undefined;
  if (field.masterDegreesMultiple) return values;
  return values.length === 1 ? values[0] : undefined;
}

/**
 * Starting answers for every study-related field in a form, keyed by field
 * name. The form page applies them to empty fields only, so an earlier answer
 * wins, and the student can still change them.
 */
export function studyPrefillForFields(
  fields: FormField[],
  student: StudentStudy,
  faculties: PrefillFaculty[],
): Record<string, string | string[]> {
  const prefill: Record<string, string | string[]> = {};
  for (const field of fields) {
    const value =
      field.type === "master-degrees"
        ? masterDegreesPrefill(field, student, faculties)
        : studyFieldPrefill(field, student);
    if (value !== undefined) prefill[field.name] = value;
  }
  return prefill;
}
