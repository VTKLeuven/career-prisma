"use server";

import { getStudentFromCookies } from "@/lib/auth-student";
import { saveSelfReportedStudy, saveStudentLanguage } from "@/lib/repos/students";
import { listFaculties, listMasters } from "@/lib/repos/features";
import { filterYears, studyEditability } from "@/lib/study-options";
import { parseChoiceValues } from "@/lib/study-choices";

/**
 * Stores the study info a student chose on Career — during onboarding, or on
 * `/student/account`.
 *
 * Only the fields `studyEditability()` opens for this student are written; the
 * rest of the input is ignored, so a crafted request cannot override what
 * vtk.be says for an SSO student. It authorizes itself, like every other action
 * in this project: the student id comes from the session cookie, never from the
 * form.
 */
export async function saveStudyDetailsAction(input: {
  /** Checklist values, `master:<id>` / `faculty:<id>` (src/lib/study-choices.ts). */
  studies: string[];
  years: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const student = await getStudentFromCookies();
  if (!student) return { ok: false, error: "You are not signed in." };

  const editable = studyEditability(student);
  if (!editable.programmes && !editable.years) {
    return { ok: false, error: "Your study details come from vtk.be. Change them there." };
  }

  let study: { masterIds: number[]; facultyIds: number[] } | undefined;
  if (editable.programmes) {
    // Only ids that still exist: the checklist could be stale, or crafted.
    const [masters, faculties] = await Promise.all([
      listMasters({ limit: 500 }),
      listFaculties({ limit: 300 }),
    ]);
    const masterIds = new Set((masters ?? []).map((m) => Number(m.id)));
    const facultyIds = new Set((faculties ?? []).map((f) => Number(f.id)));
    const picked = parseChoiceValues(input.studies ?? []);
    study = {
      masterIds: picked.masterIds.filter((id) => masterIds.has(id)),
      facultyIds: picked.facultyIds.filter((id) => facultyIds.has(id)),
    };
  }
  const years = editable.years ? filterYears(input.years ?? []) : undefined;

  if (study && !study.masterIds.length && !study.facultyIds.length) {
    return { ok: false, error: "Pick at least one master or faculty." };
  }
  if (years && !years.length) {
    return { ok: false, error: "Pick your year of study." };
  }

  const saved = await saveSelfReportedStudy(student.id, { ...study, years });
  if (!saved) return { ok: false, error: "Could not save your study details." };

  return { ok: true };
}

/** Stores the language a student prefers. Open to every student. */
export async function saveLanguageAction(
  language: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const student = await getStudentFromCookies();
  if (!student) return { ok: false, error: "You are not signed in." };

  if (language !== "nl" && language !== "en") {
    return { ok: false, error: "Unknown language." };
  }

  const saved = await saveStudentLanguage(student.id, language);
  return saved ? { ok: true } : { ok: false, error: "Could not save your language." };
}
