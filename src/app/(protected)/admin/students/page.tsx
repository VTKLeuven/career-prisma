import { getUserFromCookies } from "@/lib/auth-server";
import { listStudents } from "@/lib/repos/students";
import { listFaculties, listMasters } from "@/lib/repos/features";
import { studyEditability } from "@/lib/study-options";
import {
  studentStudyIds,
  studyChoiceGroups,
  studyChoiceLabels,
  type ChoiceFaculty,
} from "@/lib/study-choices";
import StudentsClient from "./client";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminStudentsPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const [students, masters, faculties] = await Promise.all([
    listStudents({ limit: 5000 }),
    listMasters({ limit: 500, sort: "name" }),
    listFaculties({ limit: 300 }),
  ]);

  // What each student studies, in the Education tab's terms (src/lib/study-choices.ts).
  const m = masters ?? [];
  const f = (faculties ?? []) as unknown as ChoiceFaculty[];
  const groups = studyChoiceGroups(m, f);
  const rows = students.map((s) => ({
    ...s,
    study: studyChoiceLabels(studentStudyIds(s, !studyEditability(s).programmes, m, f), groups),
  }));

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Students" description="View and manage registered students." />
      <StudentsClient initialStudents={rows} />
    </div>
  );
}
