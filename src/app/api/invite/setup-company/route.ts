// app/api/invite/setup-company/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { Company } from "@/lib/schema";
import sharp from "sharp";
import { validatePageImageDimensionsFromSize } from "@/lib/utils/image-validation";

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

    // Helper function to upload file using server token
    async function uploadFileWithServerToken(file: File): Promise<string | null> {
      try {
        // Get Form_uploads folder ID
        const { getFormUploadsFolderId } = await import("@/lib/directus");
        const folderId = await getFormUploadsFolderId();

        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        if (folderId) {
          uploadFormData.append("folder", folderId);
        }

        const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL;
        if (!directusUrl) {
          console.error("DIRECTUS_URL not configured for file upload");
          return null;
        }

        const uploadUrl = `${directusUrl.replace(/\/$/, "")}/files`;
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serverToken}`,
          },
          body: uploadFormData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          console.error("Directus file upload failed:", uploadData);
          return null;
        }

        const fileId = uploadData?.data?.id ?? null;
        if (!fileId) {
          return null;
        }

        // Update the file to set the folder if needed
        if (folderId && fileId) {
          const uploadedFolderId = uploadData?.data?.folder || uploadData?.folder;
          if (uploadedFolderId !== folderId) {
            try {
              const updateUrl = `${directusUrl.replace(/\/$/, "")}/files/${fileId}`;
              const updateRes = await fetch(updateUrl, {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${serverToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ folder: folderId }),
              });

              if (!updateRes.ok) {
                const updateError = await updateRes.json().catch(() => ({ message: "Update failed" }));
                console.warn("Failed to update file folder:", updateError);
              }
            } catch (updateErr) {
              console.warn("Error updating file folder:", updateErr);
            }
          }
        }

        return fileId;
      } catch (err) {
        console.error("Error uploading file to Directus:", err);
        return null;
      }
    }

    // Handle logo upload
    const logoFile = formData.get("logo") as File | null;
    if (logoFile && logoFile.size > 0 && logoFile.name) {
      const logoId = await uploadFileWithServerToken(logoFile);
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
      // Validate image dimensions server-side
      try {
        const arrayBuffer = await pageImageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const metadata = await sharp(buffer).metadata();
        
        if (metadata.width && metadata.height) {
          const validation = validatePageImageDimensionsFromSize(metadata.width, metadata.height);
          if (!validation.valid) {
            return NextResponse.json(
              { error: validation.error || "Invalid image dimensions" },
              { status: 400 }
            );
          }
        }
      } catch (err) {
        console.error("Error validating page image dimensions:", err);
        return NextResponse.json(
          { error: "Failed to validate image dimensions" },
          { status: 400 }
        );
      }
      
      const pageImageId = await uploadFileWithServerToken(pageImageFile);
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

    // Fetch masters to build category payload
    const mastersRes = await fetch(
      `${normalizedBase}items/master?fields=id,name&limit=1000`,
      {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      }
    );

    if (!mastersRes.ok) {
      console.error("Failed to fetch masters:", await mastersRes.text());
      return NextResponse.json(
        { error: "Failed to fetch master categories" },
        { status: 500 }
      );
    }

    const mastersData = await mastersRes.json();
    const masters = mastersData.data || [];

    // Build category payload from selected master IDs
    const categoryPayload = masters
      .filter((m: { id: string }) => selectedMasters.includes(m.id))
      .map((m: { id: string }) => ({ master_id: m.id }));

    // Build the update payload with category and status
    const updatePayload: Partial<Company> = {
      ...companyData,
      category: categoryPayload as unknown as Company['category'],
      status: "published",
    };

    // Update company directly using server token
    const updateRes = await fetch(
      `${normalizedBase}items/company/${companyId}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${serverToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!updateRes.ok) {
      const errorData = await updateRes.json().catch(() => ({ message: "Update failed" }));
      console.error("Failed to update company:", errorData);
      return NextResponse.json(
        { error: errorData.errors?.[0]?.message || errorData.message || "Failed to update company" },
        { status: updateRes.status || 500 }
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

