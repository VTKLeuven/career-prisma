import { NextRequest, NextResponse } from "next/server";
import { getServerDirectusClient } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { getUserFromCookies } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user (company rep)
    const user = await getUserFromCookies();
    if (!user || !user.company) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in as a company representative." },
        { status: 401 }
      );
    }

    const client = await getServerDirectusClient();
    const companyId = typeof user.company === 'string' ? user.company : user.company.id;

    // Get optional event filter from query params
    const { searchParams } = new URL(request.url);
    const eventName = searchParams.get("event");

    // Build filter
    const filter: Record<string, unknown> = {
      company_id: { _eq: companyId },
    };

    // If event name is provided, filter by form name matching event name
    if (eventName) {
      filter["form_response_id.form_version_id.form_id.name"] = { _eq: eventName };
    }

    // Fetch all scans for this company
    const scans = await client.request(
      readItems("attendant_scans", {
        fields: [
          "id",
          "attendant_uuid",
          "scanned_at",
          "scanned_by.name",
          "scanned_by.email",
          "form_response_id.data",
          "form_response_id.submitted_at",
          "form_response_id.form_version_id.form_id.name",
          "form_response_id.form_version_id.form_id.id",
        ],
        filter,
        sort: "-scanned_at",
      })
    ) as unknown as Array<{
      id: string;
      attendant_uuid: string;
      scanned_at: string;
      scanned_by: {
        name: string;
        email: string;
      };
      form_response_id: {
        data: Record<string, unknown>;
        submitted_at: string;
        form_version_id: {
          form_id: {
            id: string;
            name: string;
          };
        };
      };
    }>;

    return NextResponse.json(scans);
  } catch (error) {
    console.error("Error fetching scans:", error);
    return NextResponse.json(
      { error: "Failed to fetch scans" },
      { status: 500 }
    );
  }
}

