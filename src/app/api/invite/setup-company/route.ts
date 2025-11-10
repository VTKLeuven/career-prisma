// app/api/invite/setup-company/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { setupCompanyAction, uploadCompanyLogo } from "@/app/actions/companies";
import type { Company } from "@/lib/schema";

function isFileLike(value: unknown): value is File {
  return typeof value === "object" && value !== null && "name" in value;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = formData.get("token") as string;
    const companyId = formData.get("companyId") as string;

    if (!token) {
      return NextResponse.json(
        { error: "Invite token is required" },
        { status: 400 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "DIRECTUS_URL not configured" },
        { status: 500 }
      );
    }

    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    if (!serverToken) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Validate token
    let userId: string | null = null;
    try {
      const decoded = Buffer.from(token, "base64url").toString("utf-8");
      const [id] = decoded.split(":");
      if (!id) {
        return NextResponse.json(
          { error: "Invalid invite token format" },
          { status: 400 }
        );
      }
      userId = id;
    } catch {
      return NextResponse.json(
        { error: "Invalid invite token format" },
        { status: 400 }
      );
    }

    // Verify user exists and is invited
    const userRes = await fetch(
      `${normalizedBase}users/${userId}?fields=id,email,status,company.id`,
      {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      }
    );

    if (!userRes.ok) {
      return NextResponse.json(
        { error: "User not found or invalid token" },
        { status: 404 }
      );
    }

    const userData = await userRes.json();
    const user = userData.data;

    if (user.status !== "invited") {
      return NextResponse.json(
        { error: "This invitation has already been used or is invalid" },
        { status: 400 }
      );
    }

    if (user.company?.id !== companyId) {
      return NextResponse.json(
        { error: "Company ID does not match user's company" },
        { status: 400 }
      );
    }

    // Fetch existing company data to preserve logo/page_image if not uploading new ones
    const existingCompanyRes = await fetch(
      `${normalizedBase}items/company/${companyId}?fields=logo,page_image`,
      {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      }
    );
    
    let existingLogo: string | null = null;
    let existingPageImage: string | null = null;
    
    if (existingCompanyRes.ok) {
      const existingCompanyData = await existingCompanyRes.json();
      existingLogo = existingCompanyData.data?.logo || null;
      existingPageImage = existingCompanyData.data?.page_image || null;
    }

    // Parse form data
    const companyData: Partial<Company> = {
      name: formData.get("name") as string || "",
      website: formData.get("website") as string || "",
      location: formData.get("location") as string || "",
      short_description: formData.get("short_description") as string || "",
      long_description: formData.get("long_description") as string || "",
      VAT: formData.get("VAT") as string || null,
      address_street: formData.get("address_street") as string || null,
      address_number: formData.get("address_number") as string || null,
      address_zip: formData.get("address_zip") as string || null,
      address_city: formData.get("address_city") as string || null,
      address_country: formData.get("address_country") as string || null,
    };

    // Handle logo upload
    const logoFile = formData.get("logo") as File | null;
    if (logoFile && logoFile.size > 0 && logoFile.name) {
      const logoId = await uploadCompanyLogo(logoFile);
      if (logoId) {
        companyData.logo = logoId;
      } else {
        // If upload failed, use existing logo if available
        companyData.logo = existingLogo || undefined;
      }
    } else {
      // Use existing logo if no new file uploaded
      companyData.logo = existingLogo || undefined;
    }

    // Handle page image upload (optional)
    const pageImageFile = formData.get("page_image") as File | null;
    if (pageImageFile && pageImageFile.size > 0 && pageImageFile.name) {
      const pageImageId = await uploadCompanyLogo(pageImageFile);
      if (pageImageId) {
        companyData.page_image = pageImageId;
      } else {
        // If upload failed, use existing page image if available
        companyData.page_image = existingPageImage || undefined;
      }
    } else {
      // Use existing page image if no new file uploaded
      companyData.page_image = existingPageImage || undefined;
    }

    // Get selected masters
    const selectedMastersStr = formData.get("selectedMasters") as string;
    const selectedMasters: string[] = selectedMastersStr
      ? JSON.parse(selectedMastersStr)
      : [];

    // Validate required fields (all except page_image, long_description, and billing fields)
    if (!companyData.name || !companyData.name.trim()) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }
    if (!companyData.website || !companyData.website.trim()) {
      return NextResponse.json(
        { error: "Website is required" },
        { status: 400 }
      );
    }
    if (!companyData.location || !companyData.location.trim()) {
      return NextResponse.json(
        { error: "Location is required" },
        { status: 400 }
      );
    }
    if (!companyData.short_description || !companyData.short_description.trim()) {
      return NextResponse.json(
        { error: "Short description is required" },
        { status: 400 }
      );
    }
    // Validate logo is present (required field)
    if (!companyData.logo) {
      return NextResponse.json(
        { error: "Company logo is required" },
        { status: 400 }
      );
    }
    if (!selectedMasters || selectedMasters.length === 0) {
      return NextResponse.json(
        { error: "At least one master category is required" },
        { status: 400 }
      );
    }

    // Update company
    const result = await setupCompanyAction(companyId, companyData, selectedMasters);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update company" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting up company:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

