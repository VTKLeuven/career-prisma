import { NextRequest, NextResponse } from "next/server";
import { getAdminDirectusClient } from "@/lib/directus";
import { readItems } from "@directus/sdk";
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

    // Avoid filtering on `company_id` here: in some environments it's an integer column while
    // companies use UUIDs, which can cause Directus/DB errors (NaN cast).
    // Also avoid `scanned_by.company` (often restricted).
    //
    // Instead: fetch the current company and its representatives (non-system collection),
    // then filter scans by scanned_by in that representative set.
    let repIds: string[] = [];
    try {
      const companies = (await client.request(
        readItems("company", {
          fields: ["id", "representatives.id"],
          filter: { id: { _eq: companyId } },
          limit: 1,
        })
      )) as unknown as Array<{ id: string; representatives?: Array<{ id?: string } | string> }>;

      const reps = companies?.[0]?.representatives ?? [];
      repIds = reps
        .map((r) => (typeof r === "string" ? r : (r?.id ?? "")))
        .filter((id): id is string => typeof id === "string" && id.length > 0);
    } catch (e) {
      console.warn("Failed to load company representatives; falling back to user-only scans:", e);
    }

    // Always include current user as fallback (at minimum they should see their own scans)
    if (!repIds.includes(user.id)) repIds.push(user.id);

    const scans = (await client.request(
      readItems("attendant_scans", {
        fields: [
          "id",
          "attendant_uuid",
          "scanned_at",
          "liked",
          "comment",
          "feedback_updated_at",
          "scanned_by.first_name",
          "scanned_by.last_name",
          "scanned_by.email",
          "form_response_id.data",
          "form_response_id.submitted_at",
          "form_response_id.form_version_id.form_id.name",
          "form_response_id.form_version_id.form_id.id",
          "form_response_id.form_version_id.metadata",
        ],
        filter: {
          scanned_by: { _in: repIds },
        },
        sort: "-scanned_at",
        limit: -1, // Get all scans
      })
    )) as unknown as Array<{
      id: string;
      attendant_uuid: string;
      scanned_at: string;
      liked?: boolean;
      comment?: string | null;
      feedback_updated_at?: string | null;
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

