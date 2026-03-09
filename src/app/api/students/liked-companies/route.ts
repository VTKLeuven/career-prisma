import { NextResponse } from "next/server";
import { getStudentFromCookies } from "@/lib/auth-student";
import { listLikedCompanyIds } from "@/lib/repos/student-liked-companies";

export const dynamic = "force-dynamic";

/**
 * GET /api/students/liked-companies
 * Returns liked company IDs for the current student.
 * Requires student session (student_session cookie).
 */
export async function GET() {
  try {
    const student = await getStudentFromCookies();
    if (!student?.id) {
      return NextResponse.json({ ids: [] });
    }

    const ids = await listLikedCompanyIds(student.id);
    return NextResponse.json(ids);
  } catch (error) {
    console.error("[API students/liked-companies] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch liked companies" },
      { status: 500 }
    );
  }
}
