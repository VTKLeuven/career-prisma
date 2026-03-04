// Temporary debug route - remove when screening works
import { NextRequest, NextResponse } from "next/server";
import { listScreeningForCVBook } from "@/lib/repos/cv-book-screening";
import { getCVBookStudentData } from "@/lib/repos/cv-book";
import { fetchCVBookByIdAction } from "@/app/actions/cv-book";

export async function GET(request: NextRequest) {
  const cvBookId = request.nextUrl.searchParams.get("cvBookId");
  if (!cvBookId) {
    return NextResponse.json({ error: "cvBookId required" }, { status: 400 });
  }
  try {
    const book = await fetchCVBookByIdAction(cvBookId);
    if (!book) {
      return NextResponse.json({ error: "CV Book not found" }, { status: 404 });
    }
    const [groups, rawRecords] = await Promise.all([
      getCVBookStudentData(book, { forScreening: true }),
      listScreeningForCVBook(cvBookId),
    ]);
    const students = groups.flatMap((g) => g.students);
    return NextResponse.json({
      cvBookId,
      summary: {
        studentCount: students.length,
        screeningRecordCount: rawRecords.length,
        matchedCount: students.filter((s) => s.screeningRecord).length,
        approvedCount: students.filter((s) => s.screeningStatus === "approved").length,
        rejectedCount: students.filter((s) => s.screeningStatus === "rejected").length,
        pendingCount: students.filter((s) => !s.screeningStatus || s.screeningStatus === "pending").length,
      },
      rawScreeningRecords: rawRecords.slice(0, 10).map((r) => ({
        id: r.id,
        form_response: r.form_response,
        form_response_type: typeof r.form_response,
        status: r.status,
        status_type: typeof r.status,
      })),
      extractedStudents: students.slice(0, 20).map((s) => ({
        id: s.id,
        idLower: String(s.id).toLowerCase(),
        firstName: s.firstName,
        lastName: s.lastName,
        screeningStatus: s.screeningStatus,
        hasScreeningRecord: !!s.screeningRecord,
        screeningRecordId: s.screeningRecord?.id,
      })),
      allStudentIds: students.map((s) => s.id),
      allScreeningFormResponseIds: rawRecords.map((r) => {
        const fr = r.form_response ?? (r as Record<string, unknown>).form_response_id;
        return typeof fr === "string" ? fr : fr && typeof fr === "object" && "id" in fr ? (fr as { id: string }).id : null;
      }).filter(Boolean),
    });
  } catch (error) {
    console.error("[debug cv-screening]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
