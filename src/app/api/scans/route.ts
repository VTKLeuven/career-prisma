import { NextResponse, type NextRequest } from "next/server";
import { getUserFromRequestWithRefresh } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
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

  const eventName = request.nextUrl.searchParams.get("event");
  const eventId = request.nextUrl.searchParams.get("eventId");
  const scans = await prisma.attendantScan.findMany({
    where: {
      OR: [
        { company_id: companyId },
        { scannedBy: { is: { company_id: companyId } } },
      ],
    },
    include: {
      scannedBy: true,
      formResponse: {
        include: { formVersion: { include: { form: true } } },
      },
    },
    orderBy: { scanned_at: "desc" },
  });

  const shaped = scans
    .filter((scan) => {
      const version = scan.formResponse?.formVersion;
      if (eventName && version?.form?.name !== eventName) return false;
      if (eventId) {
        const metadata = version?.metadata as Record<string, unknown> | null;
        if (metadata?.event_id !== eventId) return false;
      }
      return true;
    })
    .map((scan) => ({
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
            form_version_id: scan.formResponse.formVersion
              ? {
                  metadata: scan.formResponse.formVersion.metadata,
                  form_id: scan.formResponse.formVersion.form,
                }
              : null,
          }
        : null,
    }));
  return NextResponse.json(shaped);
}
