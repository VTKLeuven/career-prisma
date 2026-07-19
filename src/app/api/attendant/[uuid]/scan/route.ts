import { NextResponse, type NextRequest } from "next/server";
import { getUserFromRequestWithRefresh } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

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

  const response = await prisma.formResponse.findFirst({
    where: { attendant_uuid: uuid, archived: { not: true } },
    select: { id: true },
  });
  if (!response) {
    return NextResponse.json({ error: "Attendant not found" }, { status: 404 });
  }

  const existing = await prisma.attendantScan.findFirst({
    where: {
      attendant_uuid: uuid,
      OR: [
        { company_id: companyId },
        { scannedBy: { is: { company_id: companyId } } },
      ],
    },
    orderBy: { scanned_at: "desc" },
  });
  if (existing) {
    return NextResponse.json({
      success: true,
      message: "Attendant already scanned",
      scanId: existing.id,
    });
  }

  const scan = await prisma.attendantScan.create({
    data: {
      attendant_uuid: uuid,
      form_response_id: response.id,
      company_id: companyId,
      scanned_by: user.id,
      scanned_at: new Date(),
    },
  });
  return NextResponse.json({
    success: true,
    message: "Attendant scanned successfully",
    scanId: scan.id,
  });
}
