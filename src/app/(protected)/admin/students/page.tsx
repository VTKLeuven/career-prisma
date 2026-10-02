import { getUserFromCookies } from "@/lib/auth-server";
import { listStudents } from "@/lib/repos/students";
import StudentsClient from "./client";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminStudentsPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const students = await listStudents({ limit: 5000 });

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Students" description="View and manage registered students." />
      <StudentsClient initialStudents={students} />
    </div>
  );
}
