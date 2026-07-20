import { getUserFromCookies } from "@/lib/auth-server";
import { listStudents } from "@/lib/repos/students";
import StudentsClient from "./client";

export default async function AdminStudentsPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const students = await listStudents({ limit: 5000 });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Students</h1>
        <p className="text-muted-foreground">
          View and manage registered students.
        </p>
      </div>
      <StudentsClient initialStudents={students} />
    </div>
  );
}
