import { NextRequest, NextResponse } from "next/server";
import { getAdminDirectusClient } from "@/lib/directus";
import { readItems } from "@directus/sdk";

export async function GET(
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

    const client = getAdminDirectusClient();
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database. Please try again later." },
        { status: 500 }
      );
    }

    // Find the form response by attendant_uuid (student form - include student who filled it)
    const responses = await client.request(
      readItems("form_responses" as any, {
        fields: [
          "id",
          "data",
          "submitted_at",
          { form_version_id: ["metadata", { form_id: ["name"] }] } as any,
          { student_id: ["first_name", "last_name", "full_name"] } as any,
        ],
        filter: {
          attendant_uuid: { _eq: uuid },
        },
        limit: 1,
      })
    ) as unknown as Array<{
      id: string;
      data: Record<string, unknown>;
      submitted_at: string;
      form_version_id: {
        form_id: {
          name: string;
        };
        metadata?: {
          scanning_columns?: {
            university?: string;
            faculty?: string;
            master?: string;
            year_of_study?: string;
          };
          [key: string]: unknown;
        };
      };
      student_id?: {
        first_name: string | null;
        last_name: string | null;
        full_name: string | null;
      } | null;
    }>;

    if (responses.length === 0) {
      return NextResponse.json(
        { error: "Attendant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(responses[0]);
  } catch (error) {
    console.error("Error fetching attendant:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendant information" },
      { status: 500 }
    );
  }
}

