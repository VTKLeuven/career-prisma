import { NextRequest, NextResponse } from "next/server";
import { getAdminDirectusClient } from "@/lib/directus";
import { readItems, readUsers } from "@directus/sdk";
import { getUserFromRequestWithRefresh } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
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

    // Extract company ID - handle both string and object cases
    let companyId: string | undefined;
    if (typeof user.company === 'string') {
      companyId = user.company;
    } else if (user.company && typeof user.company === 'object' && 'id' in user.company) {
      companyId = user.company.id;
    }

    if (!companyId) {
      console.error("Company ID extraction failed:", {
        userCompany: user.company,
        userCompanyType: typeof user.company,
        userCompanyKeys: typeof user.company === 'object' ? Object.keys(user.company) : 'N/A'
      });
      return NextResponse.json(
        { error: "Company ID not found. Please contact support." },
        { status: 400 }
      );
    }

    // Use admin client to access user data (scanned_by.name, scanned_by.email)
    // which requires elevated permissions
    const client = getAdminDirectusClient();
    if (!client) {
      console.error("Failed to get admin Directus client - DIRECTUS_SERVER_TOKEN may not be configured");
      return NextResponse.json(
        { error: "Failed to connect to database. Please try again later." },
        { status: 500 }
      );
    }

    // Get optional event filter from query params
    const { searchParams } = new URL(request.url);
    const eventName = searchParams.get("event");
    const eventId = searchParams.get("eventId");

    // Refactored to avoid nested permission issues:
    // 1. Fetch all users belonging to this company
    // 2. Fetch scans where scanned_by is in that list of users

    // Step 1: Get company users
    const companyUsers = await client.request(
      readUsers({
        filter: {
          company: { _eq: companyId },
        } as any,
        fields: ["id"],
        limit: -1,
      })
    ) as { id: string }[];

    const companyUserIds = companyUsers.map(u => u.id);

    if (companyUserIds.length === 0) {
      return NextResponse.json([]);
    }

    // Step 2: Get scans for these users
    const scans = await client.request(
      readItems("attendant_scans", {
        fields: [
          "id",
          "attendant_uuid",
          "scanned_at",
          "liked",
          "comment",
          "feedback_updated_at",
          { scanned_by: ["first_name", "last_name", "email"] },
          {
            form_response_id: [
              "data",
              "submitted_at",
              {
                form_version_id: [
                  "metadata",
                  {
                    form_id: ["name", "id"],
                  },
                ],
              },
            ],
          },
        ],
        filter: {
          "scanned_by": { _in: companyUserIds },
        },
        sort: "-scanned_at",
        limit: -1,
      })
    ) as unknown as Array<{
      id: string;
      attendant_uuid: string;
      scanned_at: string;
      scanned_by: {
        first_name: string | null;
        last_name: string | null;
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
          metadata?: {
            event_id?: string;
            [key: string]: unknown;
          };
        };
      };
      liked?: boolean;
      comment?: string | null;
      feedback_updated_at?: string | null;
    }>;

    // Transform scans to include computed name field for compatibility
    // Remove company field from scanned_by as it's not needed in response
    const transformedScans = scans.map(scan => ({
      ...scan,
      scanned_by: {
        name: (scan.scanned_by.first_name || scan.scanned_by.last_name
          ? `${scan.scanned_by.first_name ?? ""} ${scan.scanned_by.last_name ?? ""}`.trim()
          : scan.scanned_by.email) || "Unknown",
        email: scan.scanned_by.email,
      },
    }));

    // Apply event filtering in memory if needed (to avoid permission issues with nested filters)
    let filteredScans = transformedScans;

    if (eventId) {
      filteredScans = transformedScans.filter(scan => {
        const metadata = scan.form_response_id?.form_version_id?.metadata;
        return metadata && typeof metadata === 'object' && 'event_id' in metadata && metadata.event_id === eventId;
      });
    } else if (eventName) {
      filteredScans = transformedScans.filter(scan => {
        const formName = scan.form_response_id?.form_version_id?.form_id?.name;
        return formName === eventName;
      });
    }

    const res = NextResponse.json(filteredScans);
    for (const cookie of cookiesToSet) {
      res.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    return res;
  } catch (error) {
    console.error("Error fetching scans:", error);

    // Provide more detailed error information
    let errorMessage = "Failed to fetch scans";
    if (error instanceof Error) {
      errorMessage = error.message;
      // Check for common Directus permission errors
      if (error.message.includes("FORBIDDEN") || error.message.includes("permission")) {
        errorMessage = "Permission denied. You may not have access to view scans.";
      } else if (error.message.includes("NOT_FOUND")) {
        errorMessage = "Scans collection not found. Please contact support.";
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

