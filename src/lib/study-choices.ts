// lib/study-choices.ts — what a student studies, in the admin's own terms: the
// masters and faculties of the Education tab, not vtk.be's programme enums.
// Client-safe: no server-only imports.
//
// A student's choice is two id lists on `students` (`study_master_ids`,
// `study_faculty_ids`). A faculty is only a choice of its own when it has no
// masters — that is how students from outside FIRW, who mostly sign in with a
// password, say where they come from. In the checklist each one is a string
// value, `master:<id>` or `faculty:<id>`, so the two kinds share one list.

type IdLike = string | number;

/** The bits of a master / faculty this needs — both come from repos/features. */
export type ChoiceMaster = { id: IdLike; name?: string | null; study_programme?: string | null };
export type ChoiceFaculty = {
  id: IdLike;
  name?: string | null;
  masters?: Array<{ master_id: { id: IdLike; name?: string | null } | IdLike | null } | null>;
};

export type StudyChoiceOption = { value: string; label: string };
export type StudyChoiceGroup = { label: string; options: StudyChoiceOption[] };

export type StudyIds = { masterIds: string[]; facultyIds: string[] };

const isOtherFaculty = (name: string | null | undefined) => /^others?$/i.test((name ?? "").trim());
const facultyLabel = (f: ChoiceFaculty) => (isOtherFaculty(f.name) ? "Other" : `Fac. ${f.name ?? ""}`);
const byLabel = (a: StudyChoiceOption, b: StudyChoiceOption) => a.label.localeCompare(b.label);

function facultyMasterIds(faculty: ChoiceFaculty): string[] {
  return (faculty.masters ?? [])
    .map((item) => {
      const mid = item?.master_id;
      if (mid == null) return null;
      return String(typeof mid === "object" ? mid.id : mid);
    })
    .filter((id): id is string => id != null);
}

/**
 * The checklist: one group per faculty with masters, then masters no faculty
 * lists, then every faculty without masters as a choice of its own. A faculty
 * named "Other" sorts last, as it does in the master-degrees form field.
 */
export function studyChoiceGroups(masters: ChoiceMaster[], faculties: ChoiceFaculty[]): StudyChoiceGroup[] {
  const masterById = new Map(masters.map((m) => [String(m.id), m]));
  const sorted = [...faculties].sort((a, b) => {
    const aOther = isOtherFaculty(a.name);
    const bOther = isOtherFaculty(b.name);
    if (aOther !== bOther) return aOther ? 1 : -1;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  const groups: StudyChoiceGroup[] = [];
  const placed = new Set<string>();
  const withoutMasters: StudyChoiceOption[] = [];

  for (const faculty of sorted) {
    const options = facultyMasterIds(faculty)
      .map((id) => masterById.get(id))
      .filter((m): m is ChoiceMaster => m != null)
      .map((m) => ({ value: `master:${m.id}`, label: m.name ?? "" }))
      .sort(byLabel);
    if (options.length === 0) {
      withoutMasters.push({ value: `faculty:${faculty.id}`, label: facultyLabel(faculty) });
      continue;
    }
    for (const o of options) placed.add(o.value);
    groups.push({ label: facultyLabel(faculty), options });
  }

  const loose = masters
    .map((m) => ({ value: `master:${m.id}`, label: m.name ?? "" }))
    .filter((o) => !placed.has(o.value))
    .sort(byLabel);
  if (loose.length) groups.push({ label: groups.length ? "Other masters" : "Masters", options: loose });

  // Already in faculty order, so "Other" stays last.
  if (withoutMasters.length) groups.push({ label: "Other faculties", options: withoutMasters });

  return groups;
}

/**
 * The masters and faculties a student studies. When the programme is not
 * theirs to choose (an SSO student vtk.be has programmes for, see
 * studyEditability()), it is the masters an admin linked to those programmes
 * in /admin/masters. Otherwise it is what they ticked, minus anything an
 * admin has deleted since.
 */
export function studentStudyIds(
  student: { study_programmes: string[]; study_master_ids: string[]; study_faculty_ids: string[] },
  programmesLocked: boolean,
  masters: ChoiceMaster[],
  faculties: ChoiceFaculty[],
): StudyIds {
  if (programmesLocked) {
    return {
      masterIds: masters
        .filter((m) => m.study_programme && student.study_programmes.includes(m.study_programme))
        .map((m) => String(m.id)),
      facultyIds: [],
    };
  }
  const masterIds = new Set(masters.map((m) => String(m.id)));
  const facultyIds = new Set(faculties.map((f) => String(f.id)));
  return {
    masterIds: student.study_master_ids.filter((id) => masterIds.has(id)),
    facultyIds: student.study_faculty_ids.filter((id) => facultyIds.has(id)),
  };
}

export function toChoiceValues(ids: StudyIds): string[] {
  return [
    ...ids.masterIds.map((id) => `master:${id}`),
    ...ids.facultyIds.map((id) => `faculty:${id}`),
  ];
}

/** Checklist values back to ids. Anything malformed is dropped; callers still check the ids exist. */
export function parseChoiceValues(values: string[]): { masterIds: number[]; facultyIds: number[] } {
  const masterIds = new Set<number>();
  const facultyIds = new Set<number>();
  for (const value of values) {
    const match = /^(master|faculty):(\d+)$/.exec(String(value));
    if (!match) continue;
    const id = Number(match[2]);
    if (!Number.isSafeInteger(id)) continue;
    (match[1] === "master" ? masterIds : facultyIds).add(id);
  }
  return { masterIds: [...masterIds], facultyIds: [...facultyIds] };
}

/** Display labels for a student's choice, in checklist order (admin students list). */
export function studyChoiceLabels(ids: StudyIds, groups: StudyChoiceGroup[]): string[] {
  const chosen = new Set(toChoiceValues(ids));
  return groups.flatMap((g) => g.options.filter((o) => chosen.has(o.value)).map((o) => o.label));
}
