import { NextRequest, NextResponse } from "next/server";
import { getAdminDirectusClient } from "@/lib/directus";
import { readItems, createItem } from "@directus/sdk";
import { getUserFromCookies } from "@/lib/auth-server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> }
) {
  try {
    const params = await context.params;
    const { uuid } = params;

    if (!uuid) {
      return NextResponse.json(
        { error: "UUID is required" },
        { status: 400 }
      );
    }

    // Get the authenticated user (company rep)
    const user = await getUserFromCookies();
    if (!user || !user.company) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in as a company representative." },
        { status: 401 }
      );
    }

    const client = getAdminDirectusClient();
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database. Please try again later." },
        { status: 500 }
      );
    }
    
    // Find the form response by attendant_uuid
    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: ["id"],
        filter: {
          attendant_uuid: { _eq: uuid },
        },
        limit: 1,
      })
    ) as unknown as Array<{ id: string }>;

    if (responses.length === 0) {
      return NextResponse.json(
        { error: "Attendant not found" },
        { status: 404 }
      );
    }

    const responseId = responses[0].id;
    const companyId = typeof user.company === 'string' ? user.company : user.company.id;

    // Check if this scan already exists
    // Workaround: Filter by scanned_by user instead of company_id to avoid type mismatch
    const existingScans = await client.request(
      readItems("attendant_scans", {
        fields: ["id"],
        filter: {
          attendant_uuid: { _eq: uuid },
          scanned_by: { _eq: user.id },
        },
        limit: 1,
      })
    ) as unknown as Array<{ id: string }>;

    // If scan already exists, return success without creating duplicate
    if (existingScans.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Attendant already scanned",
        scanId: existingScans[0].id,
      });
    }

    // Create a new scan record
    // Note: If attendant_scans.company_id is an integer in the database but companies use UUIDs,
    // this indicates a schema mismatch that needs to be fixed in the database.
    // For now, we'll try to set it to the UUID. If this fails, the database schema needs to be updated.
    try {
      const scan = await client.request(
        createItem("attendant_scans", {
          attendant_uuid: uuid,
          form_response_id: responseId,
          company_id: companyId,
          scanned_by: user.id,
          scanned_at: new Date().toISOString(),
        })
      );

      return NextResponse.json({
        success: true,
        message: "Attendant scanned successfully",
        scanId: (scan as { id: string }).id,
      });
    } catch (createError: any) {
      // If creation fails due to company_id type mismatch, try without company_id
      // (assuming it might be auto-populated from scanned_by user's company)
      if (createError?.message?.includes("integer") || createError?.message?.includes("NaN")) {
        console.warn("Company ID type mismatch detected, attempting to create scan without company_id:", createError.message);
        try {
          const scan = await client.request(
            createItem("attendant_scans", {
              attendant_uuid: uuid,
              form_response_id: responseId,
              scanned_by: user.id,
              scanned_at: new Date().toISOString(),
            })
          );

          return NextResponse.json({
            success: true,
            message: "Attendant scanned successfully",
            scanId: (scan as { id: string }).id,
          });
        } catch (fallbackError) {
          console.error("Failed to create scan even without company_id:", fallbackError);
          throw createError; // Throw original error
        }
      }
      throw createError;
    }
  } catch (error) {
    console.error("Error scanning attendant:", error);
    return NextResponse.json(
      { error: "Failed to scan attendant" },
      { status: 500 }
    );
  }
}

