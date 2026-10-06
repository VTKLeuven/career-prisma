// app/api/masters/route.ts
import { NextResponse } from "next/server";
import { loadPublicMasters } from "@/lib/masters-data";
import { sharedCacheHeaders } from "@/lib/http-cache";

const CACHE_HEADERS = sharedCacheHeaders(300, 600);

export async function GET() {
  try {
    const masters = await loadPublicMasters();
    return NextResponse.json(masters, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("Error fetching masters:", error);
    return NextResponse.json(
      { error: "Failed to fetch masters" },
      { status: 500 }
    );
  }
}

