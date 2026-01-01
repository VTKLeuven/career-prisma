// app/api/masters/route.ts
import { NextResponse } from "next/server";
import { fetchMastersAction } from "@/app/actions/features";

export async function GET() {
  try {
    const masters = await fetchMastersAction();
    return NextResponse.json(masters);
  } catch (error) {
    console.error("Error fetching masters:", error);
    return NextResponse.json(
      { error: "Failed to fetch masters" },
      { status: 500 }
    );
  }
}

