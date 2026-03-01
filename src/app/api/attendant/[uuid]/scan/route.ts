import { NextRequest, NextResponse } from "next/server";
import { getAdminDirectusClient } from "@/lib/directus";
import { readItems, createItem } from "@directus/sdk";
import { getUserFromRequestWithRefresh } from "@/lib/auth-server";

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
    const { user, cookiesToSet } = await getUserFromRequestWithRefresh(request);
    if (!user) {
      const res = NextResponse.json(
        { error: "Unauthorized. Please log in as a company representative." },
        { status: 401 }
      );
      for (const cookie of cookiesToSet) {
        res.cookies.set(cookie.name, cookie.value, cookie.options);
      }
      return res;
    }
    if (!user.company) {
      const res = NextResponse.json(
        { error: "Your account is signed in, but it is not linked to a company." },
        { status: 403 }
      );
      for (const cookie of cookiesToSet) {
        res.cookies.set(cookie.name, cookie.value, cookie.options);
      }
      return res;
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
      readItems("form_responses", {
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

    // Check if this scan already exists for ANY representative in this company.
    // We avoid filtering by company_id because in some environments it is an integer column
    // while companies use UUIDs (can cause NaN cast errors).
    let repIds: string[] = [user.id];
    try {
      const companies = (await client.request(
        readItems("company", {
          fields: ["id", "representatives.id"],
          filter: { id: { _eq: companyId } },
          limit: 1,
        })
      )) as unknown as Array<{ id: string; representatives?: Array<{ id?: string } | string> }>;

      const reps = companies?.[0]?.representatives ?? [];
      const ids = reps
        .map((r) => (typeof r === "string" ? r : (r?.id ?? "")))
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      repIds = Array.from(new Set([...ids, user.id]));
    } catch (e) {
      console.warn("Failed to load company representatives; falling back to user-only scans:", e);
    }

    const existingScans = (await client.request(
      readItems("attendant_scans", {
        fields: ["id"],
        filter: {
          attendant_uuid: { _eq: uuid },
          scanned_by: { _in: repIds },
        },
        sort: "-scanned_at",
        limit: 1,
      })
    )) as unknown as Array<{ id: string }>;

    // If scan already exists, return success without creating duplicate
    if (existingScans.length > 0) {
      const res = NextResponse.json({
        success: true,
        message: "Attendant already scanned",
        scanId: existingScans[0].id,
      });
      for (const cookie of cookiesToSet) {
        res.cookies.set(cookie.name, cookie.value, cookie.options);
      }
      return res;
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

      const res = NextResponse.json({
        success: true,
        message: "Attendant scanned successfully",
        scanId: (scan as { id: string }).id,
      });
      for (const cookie of cookiesToSet) {
        res.cookies.set(cookie.name, cookie.value, cookie.options);
      }
      return res;
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

          const res = NextResponse.json({
            success: true,
            message: "Attendant scanned successfully",
            scanId: (scan as { id: string }).id,
          });
          for (const cookie of cookiesToSet) {
            res.cookies.set(cookie.name, cookie.value, cookie.options);
          }
          return res;
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

