import { NextRequest, NextResponse } from "next/server";
import { getCompaniesForEvent } from "@/lib/repos/company";
import { areEventCompaniesPublic } from "@/lib/repos/event-page";
import { toPublicCompany } from "@/lib/repos/_shape";
import { sharedCacheHeaders } from "@/lib/http-cache";

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ companies: [] });
  }
  try {
    // Hidden until an admin switches on "Attending companies" for the event;
    // hiding only the button would leave the list one fetch away.
    if (!(await areEventCompaniesPublic(eventId))) {
      return NextResponse.json({ companies: [] }, { headers: sharedCacheHeaders(60) });
    }
    const companies = (await getCompaniesForEvent(eventId, true)).map(toPublicCompany);
    return NextResponse.json(
      { companies },
      { headers: sharedCacheHeaders(60) }
    );
  } catch (error) {
    console.error("[events/companies] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies", companies: [] },
      { status: 500 }
    );
  }
}
