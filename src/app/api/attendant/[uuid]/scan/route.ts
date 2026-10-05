import { NextResponse, type NextRequest } from "next/server";
import { getUserFromRequestWithRefresh } from "@/lib/auth-server";
import { recordAttendantScan } from "@/lib/repos/scans";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await context.params;
  const { user } = await getUserFromRequestWithRefresh(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const companyId =
    typeof user.company === "string" ? user.company : user.company?.id;
  if (!companyId) {
    return NextResponse.json(
      { error: "Your account is not linked to a company" },
      { status: 403 }
    );
  }

  const result = await recordAttendantScan(uuid, companyId, user.id);
  if (!result) {
    return NextResponse.json({ error: "Attendant not found" }, { status: 404 });
  }
  return NextResponse.json({
    success: true,
    message: result.existed ? "Attendant already scanned" : "Attendant scanned successfully",
    scanId: result.scanId,
  });
}
