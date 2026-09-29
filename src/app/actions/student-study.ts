"use server";

import { getStudentFromCookies } from "@/lib/auth-student";
import { saveSelfReportedStudy, saveStudentLanguage } from "@/lib/repos/students";
import {
  filterProgrammes,
  filterYears,
  studyEditability,
} from "@/lib/study-options";

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
  programmes: string[];
  years: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const student = await getStudentFromCookies();
  if (!student) return { ok: false, error: "You are not signed in." };

  const editable = studyEditability(student);
  if (!editable.programmes && !editable.years) {
    return { ok: false, error: "Your study details come from vtk.be. Change them there." };
  }

  const programmes = editable.programmes
    ? filterProgrammes(input.programmes ?? [])
    : undefined;
  const years = editable.years ? filterYears(input.years ?? []) : undefined;

  if (programmes && !programmes.length) {
    return { ok: false, error: "Pick at least one study programme." };
  }
  if (years && !years.length) {
    return { ok: false, error: "Pick your year of study." };
  }

  const saved = await saveSelfReportedStudy(student.id, { programmes, years });
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
