// app/api/admin/update-booth-company/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateBoothCompany, getBoothsForFloorplan } from "@/lib/repos/floorplan";
import { invalidateFloorplanCache } from "@/lib/floorplan-cache";
import { getCompanyById } from "@/lib/repos/company";
import { getCompanySubOptionAnyStatus } from "@/lib/utils/company-access";
import { readItems } from "@directus/sdk";
import { getDirectusForAdminOperations } from "@/lib/directus";
import type { Booth } from "@/lib/schema";

export async function POST(req: Request) {
  try {
    const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE)?.value;

    if (!token) {
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
      const client = await getDirectusForAdminOperations();
      if (!client) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const currentBooth = await client.request(
        readItems("Booths" as any, {
          fields: ["*", { Floorplan: ["id"] }],
          filter: {
            id: {
              _eq: boothId,
            },
          },
          limit: 1,
        })
      ) as unknown as Booth[];

      if (!currentBooth || currentBooth.length === 0) {
        return NextResponse.json(
          { error: "Booth not found" },
          { status: 404 }
        );
      }

      const floorplanId = typeof currentBooth[0].Floorplan === "string"
        ? currentBooth[0].Floorplan
        : currentBooth[0].Floorplan.id;

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

