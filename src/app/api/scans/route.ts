import { NextResponse, type NextRequest } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { listCompanyScans } from "@/lib/repos/scans";

export async function GET(request: NextRequest) {
  const user = await getUserFromCookies();
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

  const scans = await listCompanyScans(companyId, {
    eventName: request.nextUrl.searchParams.get("event"),
    eventId: request.nextUrl.searchParams.get("eventId"),
  });
  return NextResponse.json(scans);
}
