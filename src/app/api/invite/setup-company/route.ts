import { NextResponse } from "next/server";
import sharp from "sharp";
import type { Company } from "@/lib/schema";
import { validateInviteToken } from "@/lib/invite-token";
import { updateCompany } from "@/lib/repos/company";
import { uploadFile } from "@/lib/file-storage";
import { validatePageImageDimensionsFromSize } from "@/lib/utils/image-validation";
import { sanitizeRichText } from "@/lib/sanitize-html";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const token = String(formData.get("token") || "");
    const companyId = String(formData.get("companyId") || "");
    if (!token || !companyId) {
      return NextResponse.json(
        { error: "Invite token and company ID are required" },
        { status: 400 }
      );
    }

    // The invited representative may set up their own company only.
    const invited = await validateInviteToken(token);
    if (!invited || invited.company_id !== companyId) {
      return NextResponse.json(
        { error: "This invitation is invalid or has expired" },
        { status: 400 }
      );
    }
    const userId = invited.id;

    const company = invited.company;
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    let logoId = company.logo_id;
    const logo = formData.get("logo");
    if (logo instanceof File && logo.size > 0) {
      logoId = await uploadFile(logo, userId);
    }

    let pageImageId = company.page_image;
    const pageImage = formData.get("page_image");
    if (pageImage instanceof File && pageImage.size > 0) {
      const metadata = await sharp(Buffer.from(await pageImage.arrayBuffer())).metadata();
      if (metadata.width && metadata.height) {
        const validation = validatePageImageDimensionsFromSize(
          metadata.width,
          metadata.height
        );
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error || "Invalid image dimensions" },
            { status: 400 }
          );
        }
      }
      pageImageId = await uploadFile(pageImage, userId);
    }

    const selectedMasters = JSON.parse(
      String(formData.get("selectedMasters") || "[]")
    ) as Array<string | number>;
    const masterIds = selectedMasters
      .map(Number)
      .filter((id) => Number.isSafeInteger(id));

    const data = {
      name: String(formData.get("name") || "").trim(),
      website: String(formData.get("website") || "").trim(),
      location: String(formData.get("location") || "").trim(),
      // Rendered as HTML on the public company page.
      short_description: sanitizeRichText(String(formData.get("short_description") || "").trim()),
      long_description: sanitizeRichText(String(formData.get("long_description") || "").trim()),
      VAT: String(formData.get("VAT") || "") || null,
      address_street: String(formData.get("address_street") || "") || null,
      address_number: String(formData.get("address_number") || "") || null,
      address_zip: String(formData.get("address_zip") || "") || null,
      address_city: String(formData.get("address_city") || "") || null,
      address_country: String(formData.get("address_country") || "") || null,
    };
    if (
      !data.name ||
      !data.website ||
      !data.location ||
      !data.short_description ||
      !logoId ||
      masterIds.length === 0
    ) {
      return NextResponse.json(
        { error: "All required company fields and a master category are required" },
        { status: 400 }
      );
    }

    // One transaction: the company's fields, its masters (category) and
    // publishing it.
    await updateCompany(companyId, {
      ...data,
      logo: logoId,
      page_image: pageImageId,
      status: "published",
      category: masterIds.map((master_id) => ({ master_id })),
    } as unknown as Partial<Company>);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting up company:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
