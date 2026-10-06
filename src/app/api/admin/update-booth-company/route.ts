// app/api/admin/update-booth-company/route.ts
import { NextResponse } from "next/server";
import { updateBoothCompany, getBoothsForFloorplan } from "@/lib/repos/floorplan";
import { invalidateFloorplanCache } from "@/lib/floorplan-cache";
import { getCompanyById } from "@/lib/repos/company";
import { getCompanySubOptionAnyStatus } from "@/lib/utils/company-access";
import { getUserFromCookies } from "@/lib/auth-server";
import { getBoothFloorplanId } from "@/lib/repos/booths";

export async function POST(req: Request) {
  try {
    const user = await getUserFromCookies();
    if (!user?.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { boothId, companyId } = body;

    if (!boothId) {
      return NextResponse.json(
        { error: "Missing boothId" },
        { status: 400 }
      );
    }

    // If assigning a company, check if it's already assigned to another booth
    if (companyId) {
      // Get the booth first to find its floorplan (use admin client for elevated permissions)
      const currentFloorplanId = await getBoothFloorplanId(boothId);
      if (currentFloorplanId === undefined) {
        return NextResponse.json(
          { error: "Booth not found" },
          { status: 404 }
        );
      }

      const floorplanId = String(currentFloorplanId);

      // Get all booths for the same floorplan
      const floorplanBooths = await getBoothsForFloorplan(floorplanId);

      // Check if company is already assigned to another booth
      const existingBooth = floorplanBooths.find(b => b.company?.id === companyId && b.id !== boothId);
      if (existingBooth) {
        // Companies with "Extra Booth" suboption can have multiple booths - don't remove from the other
        const company = await getCompanyById(companyId);
        const hasExtraBooth = getCompanySubOptionAnyStatus(company ?? undefined, "Extra Booth") !== null;
        if (!hasExtraBooth) {
          await updateBoothCompany(existingBooth.id, null);
        }
      }
    }

    // Update the booth
    const updated = await updateBoothCompany(boothId, companyId || null);

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update booth" },
        { status: 500 }
      );
    }

    // Invalidate floorplan cache so public floorplan shows updated booth assignments
    invalidateFloorplanCache();

    return NextResponse.json({
      success: true,
      booth: updated,
    });
  } catch (error) {
    console.error("Error updating booth company:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  }
}
