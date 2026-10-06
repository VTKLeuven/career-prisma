import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { listCompaniesWithRepresentatives } from "@/lib/repos/company";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUserFromCookies();
    if (!user?.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { companyIds } = body;

    if (!companyIds || !Array.isArray(companyIds)) {
      return NextResponse.json(
        { error: "Missing required field: companyIds" },
        { status: 400 }
      );
    }

    const companies = await listCompaniesWithRepresentatives(companyIds);

    // Format recipients
    const recipients = companies.map((company) => ({
      companyId: company.id,
      companyName: company.name,
      representatives: company.users.map((rep) => ({
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
