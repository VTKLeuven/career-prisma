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
      // Try multiple approaches to get the company field
      // In Directus, relationship fields can be returned as:
      // - UUID string (foreign key) when requested as just "company"
      // - Expanded object when requested as "company.*" or "company.id,company.name"
      // - Sometimes not returned if permissions don't allow it
      
      // Approach 1: Try with just "company" field (will return UUID string if not expanded)
      let userRes = await fetch(
        `${normalizedBase}users/${userId}?fields=id,email,status,metadata,company`,
        {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        }
      );

      // If that fails due to metadata permission, try without metadata
      if (!userRes.ok && userRes.status === 403) {
        console.log(`[invite/validate] Cannot access metadata (403), trying without it`);
        userRes = await fetch(
          `${normalizedBase}users/${userId}?fields=id,email,status,company`,
          {
            headers: {
              "Authorization": `Bearer ${serverToken}`,
            },
          }
        );
      }

      // If still failing, try with wildcard (gets all fields)
      if (!userRes.ok) {
        console.log(`[invite/validate] Standard fields failed (${userRes.status}), trying with wildcard`);
        userRes = await fetch(
          `${normalizedBase}users/${userId}?fields=*`,
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
        
        // Log the raw user data to see what we're getting
        console.log(`[invite/validate] User fetched - Raw response:`, JSON.stringify({
          userId: user.id,
          email: user.email,
          status: user.status,
          companyField: user.company,
          companyFieldType: typeof user.company,
          companyFieldValue: user.company,
          allUserKeys: Object.keys(user),
        }, null, 2));
        
        // The company field might be:
        // 1. An object with id, name, status (if expanded)
        // 2. A string UUID (if not expanded - this is likely the case)
        // 3. null/undefined (if no company)
        
        // If company is a string UUID, that's the company ID
        // If company is an object, extract the ID
        // If company is null/undefined, we'll search via representatives
      } else {
        const errorText = await userRes.text().catch(() => "Unknown error");
        console.error(`[invite/validate] Failed to fetch user ${userId}:`, userRes.status, errorText.substring(0, 200));
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
    // The company field might be a custom field that the server token doesn't have permission to read
    // So we'll primarily use the representatives relationship to find the company
    // First try to get company from user.company relationship (if accessible)
    let companyId: string | null = null;
    
    if (user.company !== null && user.company !== undefined) {
      if (typeof user.company === 'string') {
        // Company is stored as a UUID string (foreign key)
        companyId = user.company;
        console.log(`[invite/validate] Company field is a UUID string: ${companyId}`);
      } else if (typeof user.company === 'object' && user.company !== null) {
        // Company is an object (expanded relationship)
        if (user.company.id) {
          companyId = user.company.id;
          console.log(`[invite/validate] Company field is an object with id: ${companyId}`);
        } else {
          // Sometimes Directus returns the ID as a property directly
          const possibleId = (user.company as any).id || (user.company as any);
          if (typeof possibleId === 'string') {
            companyId = possibleId;
            console.log(`[invite/validate] Extracted company ID from object: ${companyId}`);
          }
        }
      }
    }
    
    let company = null;
    
    console.log(`[invite/validate] Company ID from user.company field: ${companyId}`);
    
    // Always search via representatives as primary method (more reliable if company field has permission issues)
    // This is the standard way to find which company a user belongs to
    if (!companyId) {
      console.log(`[invite/validate] Searching for company via representatives relationship for user ${userId}`);
      try {
        // Method 1: Try Directus filter syntax to query companies where user is in representatives
        // This is more efficient than fetching all companies
        let companiesRes = await fetch(
          `${normalizedBase}items/company?filter[representatives][_contains]=${userId}&fields=id,representatives&limit=10`,
          {
            headers: {
              "Authorization": `Bearer ${serverToken}`,
            },
          }
        );

        // If filter syntax doesn't work, try fetching all and filtering client-side
        if (!companiesRes.ok || (companiesRes.ok && (!await companiesRes.json().then(d => d.data?.length > 0).catch(() => false)))) {
          console.log(`[invite/validate] Direct filter didn't work, fetching all companies and filtering client-side`);
          companiesRes = await fetch(
            `${normalizedBase}items/company?fields=id,representatives,representatives.id,representatives.*&limit=500`,
            {
              headers: {
                "Authorization": `Bearer ${serverToken}`,
              },
            }
          );
        }

        if (companiesRes.ok) {
          const companiesData = await companiesRes.json();
          const companies = companiesData.data || [];
          
          console.log(`[invite/validate] Fetched ${companies.length} companies to search for user ${userId}`);
          
          // Log the first company's representatives structure for debugging
          if (companies.length > 0) {
            const firstCompany = companies[0];
            console.log(`[invite/validate] Sample company structure:`, JSON.stringify({
              companyId: firstCompany.id,
              hasRepresentatives: !!firstCompany.representatives,
              representativesType: typeof firstCompany.representatives,
              representativesIsArray: Array.isArray(firstCompany.representatives),
              representativesLength: Array.isArray(firstCompany.representatives) ? firstCompany.representatives.length : null,
              firstRep: Array.isArray(firstCompany.representatives) && firstCompany.representatives.length > 0 ? firstCompany.representatives[0] : null,
              firstRepType: Array.isArray(firstCompany.representatives) && firstCompany.representatives.length > 0 ? typeof firstCompany.representatives[0] : null,
              firstRepKeys: Array.isArray(firstCompany.representatives) && firstCompany.representatives.length > 0 && typeof firstCompany.representatives[0] === 'object' ? Object.keys(firstCompany.representatives[0]) : null,
            }, null, 2));
          }
          
          // Find company where user ID is in representatives
          // Representatives can be stored in different formats:
          // 1. Array of string IDs: ["user-id-1", "user-id-2"]
          // 2. Array of objects with id: [{id: "user-id-1"}, {id: "user-id-2"}]
          // 3. Array of full user objects: [{id: "user-id-1", email: "...", ...}, ...]
          for (const comp of companies) {
            if (comp.representatives && Array.isArray(comp.representatives)) {
              // Check if representatives contains user ID
              const hasUser = comp.representatives.some((rep: any) => {
                if (rep === null || rep === undefined) return false;
                
                // Case 1: Direct string match
                if (typeof rep === 'string') {
                  const matches = rep === userId;
                  if (matches) console.log(`[invite/validate] Found user ${userId} as string in company ${comp.id}`);
                  return matches;
                }
                
                // Case 2: Object with id property
                if (typeof rep === 'object') {
                  // Check if it's a user object with id
                  if (rep.id === userId) {
                    console.log(`[invite/validate] Found user ${userId} as rep.id in company ${comp.id}`);
                    return true;
                  }
                  
                  // Sometimes Directus returns nested structures
                  // Check if it's a junction table entry like { directus_users_id: "..." }
                  if (rep.directus_users_id === userId) {
                    console.log(`[invite/validate] Found user ${userId} as rep.directus_users_id in company ${comp.id}`);
                    return true;
                  }
                }
                
                return false;
              });
              
              if (hasUser) {
                companyId = comp.id;
                console.log(`[invite/validate] ✓ Found company ${companyId} via representatives search`);
                break;
              }
            } else if (comp.representatives) {
              console.log(`[invite/validate] Company ${comp.id} has representatives but it's not an array:`, typeof comp.representatives, comp.representatives);
            }
          }
          
          if (!companyId) {
            console.warn(`[invite/validate] ✗ User ${userId} not found in any company's representatives list. Checked ${companies.length} companies.`);
            console.warn(`[invite/validate] This might mean:`);
            console.warn(`[invite/validate] 1. The user is not in any company's representatives list`);
            console.warn(`[invite/validate] 2. The representatives field has a different structure than expected`);
            console.warn(`[invite/validate] 3. There's a permission issue accessing the representatives field`);
          }
        } else {
          const errorText = await companiesRes.text().catch(() => "Unknown error");
          console.error(`[invite/validate] Failed to fetch companies for representative search:`, companiesRes.status, errorText.substring(0, 500));
        }
      } catch (err) {
        console.error(`[invite/validate] Error searching for company by representatives:`, err);
        if (err instanceof Error) {
          console.error(`[invite/validate] Error stack:`, err.stack);
        }
      }
    }
    
    // Fetch company details if we have a company ID
    if (companyId) {
      console.log(`[invite/validate] Attempting to fetch company ${companyId} details`);
      
      // Try multiple approaches to fetch the company
      let companyRes = await fetch(
        `${normalizedBase}items/company/${companyId}?fields=id,name,status,logo,website,short_description,long_description,location,page_image,VAT,address_street,address_number,address_zip,address_city,address_country,address,category.master_id.id,category.master_id.name`,
        {
          headers: {
            "Authorization": `Bearer ${serverToken}`,
          },
        }
      );

      // If we get 403, the server token might not have permission to read companies
      // Try using the public client or a different endpoint
      if (!companyRes.ok && companyRes.status === 403) {
        console.warn(`[invite/validate] Server token cannot access company (403), trying alternative methods`);
        
        // Try fetching with minimal fields first
        companyRes = await fetch(
          `${normalizedBase}items/company/${companyId}?fields=id,name,status`,
          {
            headers: {
              "Authorization": `Bearer ${serverToken}`,
            },
          }
        );
      }

      // If still failing, try using the SDK which might handle permissions differently
      if (!companyRes.ok) {
        console.warn(`[invite/validate] Direct fetch failed (${companyRes.status}), trying with public access or listing all companies`);
        
        // Last resort: fetch all companies and find the one we need
        // This might work if listing is allowed but direct access is not
        try {
          const allCompaniesRes = await fetch(
            `${normalizedBase}items/company?fields=id,name,status,logo,website,short_description,long_description,location,page_image,VAT,address_street,address_number,address_zip,address_city,address_country,address,category.master_id.id,category.master_id.name&limit=1000`,
            {
              headers: {
                "Authorization": `Bearer ${serverToken}`,
              },
            }
          );
          
          if (allCompaniesRes.ok) {
            const allCompaniesData = await allCompaniesRes.json();
            const allCompanies = allCompaniesData.data || [];
            const foundCompany = allCompanies.find((c: any) => c.id === companyId);
            
            if (foundCompany) {
              company = foundCompany;
              console.log(`[invite/validate] ✓ Found company ${companyId} by listing all companies`, {
                name: company?.name,
                status: company?.status,
              });
            } else {
              console.error(`[invite/validate] Company ${companyId} not found in listed companies`);
            }
          }
        } catch (listErr) {
          console.error(`[invite/validate] Error listing companies:`, listErr);
        }
      } else if (companyRes.ok) {
        const companyData = await companyRes.json();
        company = companyData.data;
        console.log(`[invite/validate] ✓ Successfully loaded company ${companyId}`, {
          name: company?.name,
          status: company?.status,
        });
      }
      
      if (!company) {
        console.error(`[invite/validate] ✗ Could not fetch company ${companyId} details. This might be a permission issue.`);
        console.error(`[invite/validate] The server token may not have permission to read company items.`);
        console.error(`[invite/validate] Returning company ID only - frontend will need to fetch company details.`);
        
        // Even if we can't fetch the full company, we know the ID exists
        // Return a minimal company object with just the ID
        // The frontend can then fetch the company details using a different endpoint
        // or we can assume it needs setup if we can't determine the status
        company = {
          id: companyId,
          // Status is unknown, so we'll default to requiring setup
          // This is safer than skipping setup if the company actually needs it
          status: null,
        } as any;
      }
    } else {
      console.warn(`[invite/validate] No company ID found for user ${userId}`);
    }

    return NextResponse.json({
      valid: true,
      userId: user.id,
      email: user.email,
      company: company ? {
        id: company.id,
        name: company.name || null,
        status: company.status || null,
        logo: company.logo || null,
        website: company.website || null,
        short_description: company.short_description || null,
        long_description: company.long_description || null,
        location: company.location || null,
        page_image: company.page_image || null,
        VAT: company.VAT || null,
        address_street: company.address_street || null,
        address_number: company.address_number || null,
        address_zip: company.address_zip || null,
        address_city: company.address_city || null,
        address_country: company.address_country || null,
        address: company.address || null,
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

