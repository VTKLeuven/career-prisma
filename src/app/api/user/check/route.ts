import { NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { getStudentFromCookies } from "@/lib/auth-student";
import { listLikedCompanyIds } from "@/lib/repos/student-liked-companies";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const [user, student] = await Promise.all([
      getUserFromCookies(),
      getStudentFromCookies(),
    ]);
    // A student's liked companies come along, so the like buttons on public
    // pages need no second request.
    const likedCompanyIds =
      student?.id && student.email ? await listLikedCompanyIds(student.id).catch(() => []) : [];
    const response = NextResponse.json({
      companyRep:
        user?.id && user.email
          ? {
              authenticated: true,
              // Only who they represent: this answers on every public page
              // view, and nothing reads more than the id.
              company:
                typeof user.company === "string"
                  ? { id: user.company }
                  : user.company
                    ? { id: user.company.id, name: user.company.name ?? null }
                    : null,
              admin: user.admin || false,
              name: user.name || user.email,
              email: user.email,
              is_shifter: user.is_shifter || false,
            }
          : null,
      student:
        student?.id && student.email
          ? {
              authenticated: true,
              id: student.id,
              firstName: student.first_name || null,
              lastName: student.last_name || null,
              email: student.email,
              is_shifter: student.is_shifter || false,
              likedCompanyIds: likedCompanyIds.map(String),
            }
          : null,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[API /user/check] Error:", error);
    return NextResponse.json(
      { companyRep: null, student: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
