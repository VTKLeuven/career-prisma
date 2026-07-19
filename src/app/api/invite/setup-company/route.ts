import { createHash } from "crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import prisma from "@/lib/prisma";
import { uploadFile } from "@/lib/file-storage";
import { validatePageImageDimensionsFromSize } from "@/lib/utils/image-validation";

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

    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [userId, randomToken] = decoded.split(":");
    if (!userId || !randomToken) {
      return NextResponse.json({ error: "Invalid invite token" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const tokenHash = createHash("sha256").update(randomToken).digest("hex");
    if (
      !user ||
      user.status !== "invited" ||
      user.company_id !== companyId ||
      user.invite_token_hash !== tokenHash ||
      !user.invite_token_created ||
      Date.now() - user.invite_token_created.getTime() > 7 * 24 * 60 * 60 * 1000
    ) {
      return NextResponse.json(
        { error: "This invitation is invalid or has expired" },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
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
      short_description: String(formData.get("short_description") || "").trim(),
      long_description: String(formData.get("long_description") || "").trim(),
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

    await prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id: companyId },
        data: {
          ...data,
          logo_id: logoId,
          page_image: pageImageId,
          status: "published",
        },
      });
      await tx.companyMaster.deleteMany({ where: { company_id: companyId } });
      await tx.companyMaster.createMany({
        data: masterIds.map((masterId) => ({
          company_id: companyId,
          master_id: masterId,
        })),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting up company:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
