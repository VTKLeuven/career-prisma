"use server";

import { getStudentFromCookies } from "@/lib/auth-student";
import { saveSelfReportedStudy } from "@/lib/repos/students";
import { filterProgrammes, filterYears } from "@/lib/study-options";

/**
 * Stores the study info a student filled in during onboarding.
 *
 * Reached by members the SSO has no programme for — anyone not at FIRW. They
 * are signed in normally; this only fills the gap the SSO left. It authorizes
 * itself, like every other action in this project: the student id comes from
 * the session cookie, never from the form.
 */
export async function saveStudyDetailsAction(input: {
  programmes: string[];
  years: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const student = await getStudentFromCookies();
  if (!student) return { ok: false, error: "You are not signed in." };

  const programmes = filterProgrammes(input.programmes ?? []);
  const years = filterYears(input.years ?? []);

  if (!programmes.length) {
    return { ok: false, error: "Pick at least one study programme." };
  }
  if (!years.length) {
    return { ok: false, error: "Pick your year of study." };
  }

  const saved = await saveSelfReportedStudy(student.id, { programmes, years });
  if (!saved) return { ok: false, error: "Could not save your study details." };

  return { ok: true };
}
