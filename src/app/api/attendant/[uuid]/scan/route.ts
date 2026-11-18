import { NextResponse, type NextRequest } from "next/server";
import { getUserFromRequestWithRefresh } from "@/lib/auth-server";
import { findCompanyScanId, getAttendantScanWindow, recordAttendantScan } from "@/lib/repos/scans";
import { scanWindowClosedMessage } from "@/lib/utils/events";

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

  // BR-42: new scans only inside the event's scanning window. Checked here, not
  // in the UI, because this route is what records a scan.
  const scanWindow = await getAttendantScanWindow(uuid);
  const closedMessage = scanWindow ? scanWindowClosedMessage(scanWindow) : null;
  if (closedMessage) {
    // A scan made while the window was open stays reachable: the attendant
    // page posts here on every visit to get the scan id for its feedback form.
    const existingId = await findCompanyScanId(uuid, companyId);
    if (!existingId) {
      return NextResponse.json({ error: closedMessage }, { status: 403 });
    }
    return NextResponse.json({
      success: true,
      message: "Attendant already scanned",
      scanId: existingId,
    });
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
