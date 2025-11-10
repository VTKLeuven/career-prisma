// app/api/invite/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Invite token is required" },
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

    // Get admin token for user management
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    if (!serverToken) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Decode token to get userId
    let userId: string | null = null;
    let tokenHash: string | null = null;

    try {
      const decoded = Buffer.from(token, "base64url").toString("utf-8");
      const [id, rawToken] = decoded.split(":");
      
      if (!id || !rawToken) {
        return NextResponse.json(
          { error: "Invalid invite token format" },
          { status: 400 }
        );
      }

      userId = id;
      tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
    } catch {
      return NextResponse.json(
        { error: "Invalid invite token format" },
        { status: 400 }
      );
    }

    // Fetch user with company info
    let user = null;
    let userMetadata: Record<string, any> | null = null;
    
    if (userId) {
      let userRes = await fetch(
        `${normalizedBase}users/${userId}?fields=id,email,status,metadata,company.id,company.name,company.status`,
        {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        }
      );

      if (!userRes.ok && userRes.status === 403) {
        userRes = await fetch(
          `${normalizedBase}users/${userId}?fields=id,email,status,company.id,company.name,company.status`,
          {
            headers: {
              "Authorization": `Bearer ${serverToken}`,
            },
          }
        );
      }

      if (userRes.ok) {
        const userData = await userRes.json();
        user = userData.data;
        userMetadata = user.metadata || null;
      } else {
        return NextResponse.json(
          { error: "User not found or invalid token" },
          { status: 404 }
        );
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found or invalid token" },
        { status: 404 }
      );
    }

    // Verify user is in "invited" status
    if (user.status !== "invited") {
      return NextResponse.json(
        { error: "This invitation has already been used or is invalid" },
        { status: 400 }
      );
    }

    // Verify token hash if metadata is available
    if (userMetadata && userMetadata.invite_token_hash) {
      const storedTokenHash = userMetadata.invite_token_hash;
      if (storedTokenHash !== tokenHash) {
        return NextResponse.json(
          { error: "Invalid invite token" },
          { status: 400 }
        );
      }

      // Check token expiration (7 days)
      const tokenCreated = userMetadata.invite_token_created;
      if (tokenCreated) {
        const createdAt = new Date(tokenCreated);
        const now = new Date();
        const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 7) {
          return NextResponse.json(
            { error: "Invitation token has expired. Please contact support for a new invitation." },
            { status: 400 }
          );
        }
      }
    }

    // Get company info
    const companyId = user.company?.id;
    let company = null;
    if (companyId) {
      const companyRes = await fetch(
        `${normalizedBase}items/company/${companyId}?fields=id,name,status,logo,website,short_description,long_description,location,page_image,VAT,address_street,address_number,address_zip,address_city,address_country,address,category.master_id.id,category.master_id.name`,
        {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        }
      );

      if (companyRes.ok) {
        const companyData = await companyRes.json();
        company = companyData.data;
      }
    }

    return NextResponse.json({
      valid: true,
      userId: user.id,
      email: user.email,
      company: company ? {
        id: company.id,
        name: company.name,
        status: company.status || null,
        logo: company.logo,
        website: company.website,
        short_description: company.short_description,
        long_description: company.long_description,
        location: company.location,
        page_image: company.page_image,
        VAT: company.VAT,
        address_street: company.address_street,
        address_number: company.address_number,
        address_zip: company.address_zip,
        address_city: company.address_city,
        address_country: company.address_country,
        address: company.address,
        category: company.category || [],
      } : null,
    });
  } catch (error) {
    console.error("Error validating invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

