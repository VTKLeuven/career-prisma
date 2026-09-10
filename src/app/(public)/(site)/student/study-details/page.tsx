import { redirect } from "next/navigation";
import { getStudentFromCookies } from "@/lib/auth-student";
import StudyDetailsClient from "./client";

export const dynamic = "force-dynamic";

/**
 * Onboarding step for students the SSO has no study programme for — in
 * practice, members who do not study at FIRW. They sign in through the VTK SSO
 * exactly like everyone else and are never rejected; the SSO simply sends an
 * empty `vtk:study_programmes`, so they tell us here instead.
 *
 * The SSO callback routes students here when either list is empty. Once saved,
 * `study_self_reported` keeps a later login's empty claim from wiping it
 * (see `upsertStudentFromSso`).
 */
export default async function StudyDetailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.redirectTo;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  const redirectTo =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/";

  const student = await getStudentFromCookies();
  if (!student) {
    redirect(`/student-login?redirectTo=${encodeURIComponent("/student/study-details")}`);
  }

  return (
    <StudyDetailsClient
      redirectTo={redirectTo}
      name={student.first_name ?? student.full_name ?? null}
      programmes={student.study_programmes}
      years={student.study_years}
    />
  );
}
