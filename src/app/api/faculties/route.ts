// app/api/faculties/route.ts
import { NextResponse } from "next/server";
import { fetchFacultiesAction } from "@/app/actions/features";

export async function GET() {
  try {
    const faculties = await fetchFacultiesAction();
    return NextResponse.json(faculties ?? []);
  } catch (error) {
    console.error("Error fetching faculties:", error);
    return NextResponse.json(
      { error: "Failed to fetch faculties" },
      { status: 500 }
    );
  }
}
