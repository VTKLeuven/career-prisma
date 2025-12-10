// app/api/admin/delete-floorplan/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteFloorplan } from "@/lib/repos/floorplan";

export async function POST(req: Request) {
  try {
    const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { floorplanId } = body;

    if (!floorplanId) {
      return NextResponse.json(
        { error: "Missing floorplanId" },
        { status: 400 }
      );
    }

    const deleted = await deleteFloorplan(floorplanId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete floorplan" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Floorplan and all associated booths deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting floorplan:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  }
}



