"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth-server";
import { listStudents, updateStudent, deleteStudent } from "@/lib/repos/students";
import type { ActionResult } from "@/components/admin/types";
import type { Student } from "@/lib/schema";

export async function listStudentsAction(): Promise<Student[]> {
  await requireAdminUser();
  return listStudents({ limit: 5000 });
}

export async function updateStudentAction(id: string, data: Record<string, unknown>): Promise<ActionResult<Student>> {
  try {
    await requireAdminUser();
    const student = await updateStudent(Number(id), data);
    revalidatePath("/admin/students");
    return { success: true, data: student };
  } catch (error) {
    console.error("[updateStudentAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update student" };
  }
}

export async function deleteStudentAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminUser();
    await deleteStudent(Number(id));
    revalidatePath("/admin/students");
    return { success: true };
  } catch (error) {
    console.error("[deleteStudentAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete student" };
  }
}
