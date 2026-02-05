// lib/auth-student.ts
import "server-only";
import { cookies } from "next/headers";
import { Student } from "@/lib/schema";

const STUDENT_SESSION_COOKIE = "student_session";

/**
 * Get current student from session cookie
 */
export async function getStudentFromCookies(): Promise<Student | null> {
  try {
    const cookieStore = await cookies();
    const studentId = cookieStore.get(STUDENT_SESSION_COOKIE)?.value;

    if (!studentId) {
      return null;
    }

    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) {
      return null;
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;

    if (!serverToken) {
      return null;
    }

    const res = await fetch(
      `${normalizedBase}items/students/${studentId}?fields=*,is_shifter`,
      {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      }
    );

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    return json.data as Student;
  } catch {
    return null;
  }
}

/**
 * Clear student session cookie
 */
export async function clearStudentSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(STUDENT_SESSION_COOKIE);
}



