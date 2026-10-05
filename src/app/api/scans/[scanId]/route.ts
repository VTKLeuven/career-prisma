import { NextResponse, type NextRequest } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { deleteScan, getCompanyScan, updateScanFeedback } from "@/lib/repos/scans";

/** The scan, when it belongs to the signed-in rep's company. */
async function authorize(scanId: string) {
  const user = await getUserFromCookies();
  const companyId =
    typeof user?.company === "string" ? user.company : user?.company?.id;
  if (!user || !companyId) return null;
  return getCompanyScan(scanId, companyId);
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await context.params;
  const scan = await authorize(scanId);
  return scan
    ? NextResponse.json(scan)
    : NextResponse.json({ error: "Scan not found" }, { status: 404 });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await context.params;
  if (!(await authorize(scanId))) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }
  const body = (await request.json()) as { liked?: unknown; comment?: unknown };
  await updateScanFeedback(scanId, {
    ...(typeof body.liked === "boolean" && { liked: body.liked }),
    ...(typeof body.comment === "string" && { comment: body.comment }),
  });
  return GET(request, context);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await context.params;
  if (!(await authorize(scanId))) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }
  await deleteScan(scanId);
  return NextResponse.json({ success: true });
}
