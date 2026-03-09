// app/api/masters/route.ts
import { NextResponse } from "next/server";
import { fetchMastersAction } from "@/app/actions/features";
import { getCachedOurStudents, setCachedOurStudents } from "@/lib/our-students-cache";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  "CDN-Cache-Control": "public, s-maxage=300",
};

export async function GET() {
  try {
    // Check cache first (used by our-students page)
    const cached = getCachedOurStudents();
    if (cached) {
      return NextResponse.json(cached, { headers: CACHE_HEADERS });
    }

    const masters = await fetchMastersAction();
    setCachedOurStudents(masters);
    return NextResponse.json(masters, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("Error fetching masters:", error);
    return NextResponse.json(
      { error: "Failed to fetch masters" },
      { status: 500 }
    );
  }
}

