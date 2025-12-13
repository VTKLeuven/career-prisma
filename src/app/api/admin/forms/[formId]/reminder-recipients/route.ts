import { NextRequest, NextResponse } from "next/server";
import { getServerDirectusClient } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { getUserFromCookies } from "@/lib/auth-server";
import { cookies } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    // Check authentication
    const user = await getUserFromCookies();
    if (!user?.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId } = await params;
    const body = await request.json();
    const { companyIds } = body;

    if (!companyIds || !Array.isArray(companyIds)) {
      return NextResponse.json(
        { error: "Missing required field: companyIds" },
        { status: 400 }
      );
    }

    const client = await getServerDirectusClient();
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Get all companies with their representatives
    const companies = await client.request(
      readItems("company", {
        fields: [
          "id",
          "name",
          "representatives.id",
          "representatives.email",
          "representatives.first_name",
          "representatives.last_name",
        ],
        filter: {
          id: { _in: companyIds },
        },
        limit: -1,
      })
    ) as any[];

    // Format recipients
    const recipients = companies.map((company) => ({
      companyId: company.id,
      companyName: company.name,
      representatives: (company.representatives || []).map((rep: any) => ({
        id: rep.id,
        email: rep.email || null,
        firstName: rep.first_name || "",
        lastName: rep.last_name || "",
        selected: true, // Default to selected
      })),
    }));

    return NextResponse.json({
      success: true,
      recipients,
    });
  } catch (error) {
    console.error("Error in reminder-recipients route:", error);
    return NextResponse.json(
      {
        error: "Failed to load recipients",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

