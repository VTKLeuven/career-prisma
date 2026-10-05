import { redirect } from "next/navigation";
import { getStudentFromCookies } from "@/lib/auth-student";
import { studyEditability } from "@/lib/study-options";
import { vtkAccountUrl } from "@/lib/vtk-sso";
import StudentAccountClient from "./client";

export const dynamic = "force-dynamic";

/**
 * A student's own account: their details, password, preferred language and
 * study info (meant to pre-fill forms later on), and deleting the account.
 *
 * For an SSO student vtk.be owns name, email and r-number, and there is no
 * password; those show read-only with a link to vtk.be.
 *
 * For an SSO student vtk.be owns the study info: the fields are greyed out,
 * with a link to change it at vtk.be and a "Refresh from vtk.be" button that
 * runs the login flow again — a login is the only moment this app hears from
 * the SSO, and with a live vtk.be session it is over in a redirect. The "From
 * vtk.be" panel shows exactly what the SSO last sent, which doubles as the
 * place to check that the claims arrive.
 */
export default async function StudentAccountPage() {
  const student = await getStudentFromCookies();
  if (!student) {
    redirect(`/student-login?redirectTo=${encodeURIComponent("/student/account")}`);
  }

  // Only what the page shows, not the whole shaped student.
  return (
    <StudentAccountClient
      name={student.full_name ?? ([student.first_name, student.last_name].filter(Boolean).join(" ") || student.email)}
      email={student.email}
      firstName={student.first_name ?? ""}
      lastName={student.last_name ?? ""}
      university={student.university ?? ""}
      studentNumber={student.student_number ?? null}
      hasPassword={Boolean(student.has_password)}
      viaSso={Boolean(student.sso_subject)}
      language={student.preferred_language === "nl" ? "nl" : student.preferred_language === "en" ? "en" : null}
      programmes={student.study_programmes}
      years={student.study_years}
      editable={studyEditability(student)}
      vtkAccountUrl={vtkAccountUrl()}
      fromVtk={
        student.sso_subject
          ? {
              syncedAt: student.sso_synced_at ?? null,
              studentNumber: student.student_number ?? null,
              programmes: student.sso_study_programmes,
              years: student.sso_study_years,
              notAtFaculty: student.not_at_faculty ?? null,
              confirmedYear: student.study_confirmed_year ?? null,
              locale: student.sso_locale ?? null,
            }
          : null
      }
    />
  );
}
