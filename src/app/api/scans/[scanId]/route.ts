import { NextResponse, type NextRequest } from "next/server";
import { getUserFromRequestWithRefresh } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

async function authorize(request: NextRequest, scanId: string) {
  const { user } = await getUserFromRequestWithRefresh(request);
  const companyId =
    typeof user?.company === "string" ? user.company : user?.company?.id;
  if (!user || !companyId) return null;
  return prisma.attendantScan.findFirst({
    where: {
      id: scanId,
      OR: [
        { company_id: companyId },
        { scannedBy: { is: { company_id: companyId } } },
      ],
    },
    include: { scannedBy: true, formResponse: true },
  });
}

function shapeScan(scan: NonNullable<Awaited<ReturnType<typeof authorize>>>) {
  return {
    id: scan.id,
    attendant_uuid: scan.attendant_uuid,
    scanned_at: scan.scanned_at?.toISOString(),
    liked: scan.liked,
    comment: scan.comment,
    feedback_updated_at: scan.feedback_updated_at?.toISOString(),
    scanned_by: {
      name:
        [scan.scannedBy?.first_name, scan.scannedBy?.last_name]
          .filter(Boolean)
          .join(" ") ||
        scan.scannedBy?.email ||
        "Unknown",
      email: scan.scannedBy?.email || "",
    },
    form_response_id: scan.formResponse
      ? {
          data: scan.formResponse.data,
          submitted_at: scan.formResponse.submitted_at?.toISOString(),
        }
      : null,
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await context.params;
  const scan = await authorize(request, scanId);
  return scan
    ? NextResponse.json(shapeScan(scan))
    : NextResponse.json({ error: "Scan not found" }, { status: 404 });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await context.params;
  const scan = await authorize(request, scanId);
  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }
  const body = (await request.json()) as { liked?: unknown; comment?: unknown };
  await prisma.attendantScan.update({
    where: { id: scanId },
    data: {
      ...(typeof body.liked === "boolean" && { liked: body.liked }),
      ...(typeof body.comment === "string" && { comment: body.comment }),
      feedback_updated_at: new Date(),
    },
  });
  return GET(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await context.params;
  const scan = await authorize(request, scanId);
  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }
  await prisma.attendantScan.delete({ where: { id: scanId } });
  return NextResponse.json({ success: true });
}
