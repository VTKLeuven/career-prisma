import "server-only";

import type { Faculty, Student } from "@/lib/schema";
import { listFaculties, listMasters } from "@/lib/repos/features";
import { studyEditability } from "@/lib/study-options";
import {
  studentStudyIds,
  studyChoiceGroups,
  type ChoiceFaculty,
  type StudyChoiceGroup,
  type StudyIds,
} from "@/lib/study-choices";

/**
 * A student's study choice with what it is chosen from: the checklist groups
 * for /student/account and onboarding, and the resolved ids for form prefill.
 */
export async function loadStudentStudy(student: Student): Promise<{
  groups: StudyChoiceGroup[];
  ids: StudyIds;
  faculties: Faculty[];
}> {
  const [masters, faculties] = await Promise.all([
    listMasters({ limit: 500, sort: "name" }),
    listFaculties({ limit: 300 }),
  ]);
  const m = masters ?? [];
  const f = (faculties ?? []) as Faculty[];
  const choiceFaculties = f as unknown as ChoiceFaculty[];
  return {
    groups: studyChoiceGroups(m, choiceFaculties),
    ids: studentStudyIds(student, !studyEditability(student).programmes, m, choiceFaculties),
    faculties: f,
  };
}
