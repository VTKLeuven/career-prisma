// app/actions/companies.ts
"use server";
import { listCompanies, getCompanyById, createCompany, updateCompany } from "@/lib/repos/company";
import { createRep, updateRep, waitForApproval, deleteUser, fetchPendingApprovalRequests, type PendingApprovalRequest } from "@/lib/repos/users";
import { Company, CompanyRep, CareerEventOption } from "@/lib/schema";
import { uploadDirectusFile, sendEmail } from "@/lib/repos/directus";
import { getUserFromCookies } from "@/lib/auth-server";
import { cookies } from "next/headers";
import { fetchMastersAction } from "@/app/actions/features";
import { generateCompanyPageRequestEmailHtml } from "@/lib/email-templates";



function formatAddress(c: Company) {
  const parts = [
    [c.address_street, c.address_number].filter(Boolean).join(" ").trim(),
    [c.address_zip, c.address_city].filter(Boolean).join(" ").trim(),
    c.address_country,
  ]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter((p) => p.length > 0);

  return parts.length ? parts.join(", ") : "Not set";
}

/**
 * Check if company has all required information filled in for publishing
 * Required fields: name, VAT, all address fields, logo, short_description, website, location, at least one category
 * Excluded: page_image, long_description
 */
function isCompanyInfoComplete(company: Company): boolean {
  // Check name
  if (!company.name || company.name.trim().length === 0) {
    return false;
  }

  // Check VAT
  if (!company.VAT || company.VAT.trim().length === 0) {
    return false;
  }

  // Check all address fields
  if (!company.address_street || company.address_street.trim().length === 0) {
    return false;
  }
  if (!company.address_number || company.address_number.trim().length === 0) {
    return false;
  }
  if (!company.address_zip || company.address_zip.trim().length === 0) {
    return false;
  }
  if (!company.address_city || company.address_city.trim().length === 0) {
    return false;
  }
  if (!company.address_country || company.address_country.trim().length === 0) {
    return false;
  }

  // Check logo
  if (!company.logo || (typeof company.logo === "string" && company.logo.trim().length === 0)) {
    return false;
  }

  // Check short_description
  if (!company.short_description || company.short_description.trim().length === 0) {
    return false;
  }

  // Check website
  if (!company.website || company.website.trim().length === 0) {
    return false;
  }

  // Check location
  if (!company.location || company.location.trim().length === 0) {
    return false;
  }

  // Check category (at least one master category)
  if (!company.category || !Array.isArray(company.category) || company.category.length === 0) {
    return false;
  }

  return true;
}

export async function fetchCompaniesAction() {
  const companies = (await listCompanies({ limit: 50, sort: "name" })) ?? [];

  return companies.map((c: Company) => ({
    id: c.id,
    name: c.name,
    address: formatAddress(c),
    VAT: c.VAT ?? "Not set",
    salesperson:
      typeof c.salesperson === "object" && c.salesperson
        ? `${c.salesperson.first_name ?? ""} ${c.salesperson.last_name ?? ""}`.trim() ||
          c.salesperson.id
        : typeof c.salesperson === "string" && c.salesperson
        ? c.salesperson
        : "Not set",

    // Include options so you can access events
    options: c.options ?? [],
    category: c.category ?? [],
    representatives: c.representatives ?? [],
  }));
}

export async function fetchCompanyByIdAction(company_id: string, usePublic = false): Promise<Company | null> {
  const company = (await getCompanyById(company_id, usePublic)) as Company | null;
  return company;
}

function slugifyName(name?: string | null): string {
  return (name ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "") // Remove special characters except hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

export async function fetchCompanyBySlugAction(slug: string): Promise<Company | null> {
  // Use public client for unauthenticated access
  const companies = (await listCompanies({ limit: 200, sort: "name", usePublic: true })) ?? [];

  // Debug logging
  if (process.env.NODE_ENV === "development") {
    console.log("fetchCompanyBySlugAction - Looking for slug:", slug);
    console.log("fetchCompanyBySlugAction - Available companies:", companies.map(c => ({
      id: c.id,
      name: c.name,
      slug: slugifyName(c.name)
    })));
  }

  const match = companies.find((c: Company) => {
    const companySlug = slugifyName(c.name);
    return companySlug === slug;
  });

  if (!match) {
    if (process.env.NODE_ENV === "development") {
      console.log("fetchCompanyBySlugAction - No match found for slug:", slug);
    }
    return null;
  }

  // Fetch full company details with all relations (use public client)
  const fullCompany = await fetchCompanyByIdAction(match.id, true);

  if (process.env.NODE_ENV === "development") {
    console.log("fetchCompanyBySlugAction - Found company:", fullCompany?.name);
  }

  return fullCompany;
}

export async function createCompanyAction(companyPayload: Partial<Company>, repPayload?: Partial<CompanyRep>) {

  if (repPayload && (repPayload.email || repPayload.first_name || repPayload.last_name)) {
    const newRep = await createRep(repPayload);
    
    if (!newRep || !newRep.id) {
      console.error("[createCompanyAction] Failed to create representative:", repPayload.email);
      throw new Error("Failed to create representative");
    }
    
    console.log(`[createCompanyAction] Representative created successfully: ${newRep.id} (${repPayload.email})`);
    
    const updatedRep = await updateRep(newRep.id, {
      first_name: repPayload.first_name,
      last_name: repPayload.last_name,
    });
    
    // Use newRep.id since updatedRep might be null if update failed
    // The user is created successfully even if the name update fails
    const repIdForCompany = updatedRep?.id || newRep.id;
    
    if (!updatedRep) {
      console.warn(`[createCompanyAction] Failed to update rep details for ${newRep.id}, but continuing with user creation...`);
    }

    // Create a mutable payload with representatives as string array for the API
    const payload = {
      ...companyPayload,
      representatives: [repIdForCompany] as unknown as CompanyRep[]
    };

    const createdCompany = await createCompany(payload as Partial<Company>);

    // Send invitation email to the representative
    if (repPayload.email && newRep?.id) {
      try {
        console.log(`[createCompanyAction] Generating invite token for user ${newRep.id} (${repPayload.email})`);
        
        // Small delay to ensure user is fully created in Directus
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Generate secure invite token
        const { generateInviteToken } = await import("@/lib/repos/users");
        const tokenData = await generateInviteToken(newRep.id);

        if (tokenData && tokenData.token) {
          console.log(`[createCompanyAction] Token generated successfully for ${repPayload.email}`);
          
          // Build accept invite URL with token
          const frontendBaseUrl = process.env.NEXT_PUBLIC_APP_URL 
            || process.env.NEXT_PUBLIC_FORM_DOMAIN 
            || (process.env.DIRECTUS_URL ? process.env.DIRECTUS_URL.replace(/\/api.*$/, "") : "http://localhost:3000");
          
          const acceptInviteUrl = `${frontendBaseUrl}/accept-invite?token=${encodeURIComponent(tokenData.token)}`;
          
          // Send custom invitation email using our SMTP setup
          const { sendEmail } = await import("@/lib/repos/directus");
          const { generateInvitationEmailHtml } = await import("@/lib/email-templates");
          
          const emailHtml = generateInvitationEmailHtml({
            firstName: repPayload.first_name ?? undefined,
            lastName: repPayload.last_name ?? undefined,
            companyName: companyPayload.name,
            acceptInviteUrl,
          });
          
          await sendEmail({
            to: repPayload.email,
            subject: `Welcome to VTK Career Platform${companyPayload.name ? ` - ${companyPayload.name}` : ''}`,
            html: emailHtml,
          });
          
          console.log(`[createCompanyAction] Invitation email sent to ${repPayload.email}`);
        } else {
          console.error(`[createCompanyAction] Failed to generate invite token for user ${newRep.id} (${repPayload.email}) - tokenData is null or missing token`);
        }
      } catch (err) {
        console.error(`[createCompanyAction] Error sending invitation email to ${repPayload.email}:`, err);
        if (err instanceof Error) {
          console.error(`[createCompanyAction] Error stack:`, err.stack);
        }
        // Don't throw - email failure shouldn't prevent company creation
      }
    }

    return createdCompany;
  }
  return await createCompany(companyPayload);
}

export async function createCompanyRepAction(companyId: string, repPayload: Partial<CompanyRep>) {
  if (!repPayload) return null;
  const newRep = await createRep(repPayload);
  
  if (!newRep || !newRep.id) {
    console.error("Failed to create representative");
    return null;
  }
  
  await updateRep(newRep.id, {
    first_name: repPayload.first_name,
    last_name: repPayload.last_name,
  });

  const company = await fetchCompanyByIdAction(companyId);

  if (!company) {return;}

  // Build representatives array as string IDs
  let representativeIds: string[] = [];

  if (company.representatives) {
    // If representatives is an array of objects with id property, extract the ids
    representativeIds = (company.representatives as (CompanyRep | string)[]).map((item: CompanyRep | string) => {
      return typeof item === 'string' ? item : item?.id ?? '';
    });
  }

  // Add the new rep
  representativeIds.push(newRep.id);

  console.log(representativeIds)

  const result = await updateCompanyAction(companyId, {representatives: representativeIds as unknown as CompanyRep[]});

  // Send invitation email to the representative
  if (repPayload.email && newRep?.id) {
    try {
      console.log(`[createCompanyRepAction] Generating invite token for user ${newRep.id} (${repPayload.email})`);
      
      // Small delay to ensure user is fully created in Directus
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate secure invite token
      const { generateInviteToken } = await import("@/lib/repos/users");
      const tokenData = await generateInviteToken(newRep.id);

      if (tokenData && tokenData.token) {
        console.log(`[createCompanyRepAction] Token generated successfully for ${repPayload.email}`);
        
        // Build accept invite URL with token
        const frontendBaseUrl = process.env.NEXT_PUBLIC_APP_URL 
          || process.env.NEXT_PUBLIC_FORM_DOMAIN 
          || (process.env.DIRECTUS_URL ? process.env.DIRECTUS_URL.replace(/\/api.*$/, "") : "http://localhost:3000");
        
        const acceptInviteUrl = `${frontendBaseUrl}/accept-invite?token=${encodeURIComponent(tokenData.token)}`;
        
        // Send custom invitation email using our SMTP setup
        const { sendEmail } = await import("@/lib/repos/directus");
        const { generateInvitationEmailHtml } = await import("@/lib/email-templates");
        
        const emailHtml = generateInvitationEmailHtml({
          firstName: repPayload.first_name ?? undefined,
          lastName: repPayload.last_name ?? undefined,
          companyName: company.name,
          acceptInviteUrl,
        });
        
        await sendEmail({
          to: repPayload.email,
          subject: `Welcome to VTK Career Platform${company.name ? ` - ${company.name}` : ''}`,
          html: emailHtml,
        });
        
        console.log(`[createCompanyRepAction] Invitation email sent to ${repPayload.email}`);
      } else {
        console.error(`[createCompanyRepAction] Failed to generate invite token for user ${newRep.id} (${repPayload.email}) - tokenData is null or missing token`);
      }
    } catch (err) {
      console.error(`[createCompanyRepAction] Error sending invitation email to ${repPayload.email}:`, err);
      if (err instanceof Error) {
        console.error(`[createCompanyRepAction] Error stack:`, err.stack);
      }
      // Don't throw - email failure shouldn't prevent rep creation
    }
  }

  return result;
}

export async function requestRepAction(repPayload: Partial<CompanyRep>) {
  if (!repPayload) throw new Error("No rep payload");

  const salespersonId = typeof repPayload?.company?.salesperson === "string"
    ? repPayload.company.salesperson
    : repPayload?.company?.salesperson && typeof repPayload.company.salesperson === "object"
    ? repPayload.company.salesperson.id
    : undefined;

  if (!salespersonId) {
    throw new Error("Salesperson ID not found");
  }

  if (!repPayload.company?.id) {
    throw new Error("Company ID not found");
  }

  if (!repPayload.email) {
    throw new Error("Email is required");
  }

  // 1️⃣ Create approval request and wait for salesperson's approval
  const approved = await waitForApproval(salespersonId, repPayload);

  if (!approved) {
    console.log("Rep request was rejected or expired");
    return { status: "rejected" };
  }

  // 2️⃣ Once approved, check if user was already created by approveRepRequestAction
  // If not, create it. This handles the case where approval happens via the admin UI
  // and createUserFromApprovedRequest already created the user.
  const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? 'directus'}_access`;
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) {
    throw new Error("No token available");
  }

  const baseUrl = process.env.DIRECTUS_URL;
  if (!baseUrl) {
    throw new Error("DIRECTUS_URL not configured");
  }

  const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

  // Use server token if available for user operations (more reliable permissions)
  const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
  const authToken = serverToken || token;

  // Fetch company details (needed for email and adding to representatives)
  const company = await fetchCompanyByIdAction(repPayload.company.id);
  if (!company) {
    throw new Error("Company not found");
  }

  // Check if user already exists (might have been created by approveRepRequestAction)
  const checkUserRes = await fetch(
    `${normalizedBase}users?filter[email][_eq]=${encodeURIComponent(repPayload.email)}&fields=id`,
    {
      headers: {
        "Authorization": `Bearer ${authToken}`,
      },
    }
  );

  let userId: string | undefined;

  if (checkUserRes.ok) {
    const userData = await checkUserRes.json();
    const existingUser = userData.data?.[0];

    if (existingUser) {
      // User already exists (created by approveRepRequestAction)
      userId = existingUser.id;
      console.log(`[requestRepAction] User already exists: ${userId} (${repPayload.email})`);
    }
  }

  // If user doesn't exist, create it (fallback for cases where approval happened but user wasn't created)
  if (!userId) {
    console.log(`[requestRepAction] Creating user for ${repPayload.email}`);
    const newRep = await createRep(repPayload);

    if (!newRep || !newRep.id) {
      throw new Error("Failed to create user");
    }

    userId = newRep.id;

    // Update the rep data (name, etc.)
    await updateRep(newRep.id, {
      first_name: repPayload.first_name,
      last_name: repPayload.last_name,
      tel: repPayload.tel,
      title: repPayload.title,
    });

    // Send invitation email (same process as first rep)
    if (repPayload.email && newRep.id) {
      try {
        console.log(`[requestRepAction] Generating invite token for user ${newRep.id} (${repPayload.email})`);
        
        // Small delay to ensure user is fully created in Directus
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Generate secure invite token
        const { generateInviteToken } = await import("@/lib/repos/users");
        const tokenData = await generateInviteToken(newRep.id);

        if (tokenData && tokenData.token) {
          console.log(`[requestRepAction] Token generated successfully for ${repPayload.email}`);
          
          // Build accept invite URL with token
          const frontendBaseUrl = process.env.NEXT_PUBLIC_APP_URL 
            || process.env.NEXT_PUBLIC_FORM_DOMAIN 
            || (process.env.DIRECTUS_URL ? process.env.DIRECTUS_URL.replace(/\/api.*$/, "") : "http://localhost:3000");
          
          const acceptInviteUrl = `${frontendBaseUrl}/accept-invite?token=${encodeURIComponent(tokenData.token)}`;
          
          // Send custom invitation email using our SMTP setup
          const { sendEmail } = await import("@/lib/repos/directus");
          const { generateInvitationEmailHtml } = await import("@/lib/email-templates");
          
          const emailHtml = generateInvitationEmailHtml({
            firstName: repPayload.first_name ?? undefined,
            lastName: repPayload.last_name ?? undefined,
            companyName: company.name,
            acceptInviteUrl,
          });
          
          await sendEmail({
            to: repPayload.email,
            subject: `Welcome to VTK Career Platform${company.name ? ` - ${company.name}` : ''}`,
            html: emailHtml,
          });
          
          console.log(`[requestRepAction] Invitation email sent to ${repPayload.email}`);
        } else {
          console.error(`[requestRepAction] Failed to generate invite token for user ${newRep.id} (${repPayload.email})`);
        }
      } catch (err) {
        console.error(`[requestRepAction] Error sending invitation email to ${repPayload.email}:`, err);
        // Don't throw - email failure shouldn't prevent user creation
      }
    }
  }

  // 3️⃣ Add the user to the company's representatives list (if not already added)

  // Build representatives array as string IDs
  let representativeIds: string[] = [];
  if (company.representatives) {
    representativeIds = (company.representatives as (CompanyRep | string)[]).map((item: CompanyRep | string) => {
      return typeof item === 'string' ? item : item?.id ?? '';
    }).filter(Boolean);
  }

  // Add the user if not already present
  if (userId && !representativeIds.includes(userId)) {
    representativeIds.push(userId);
    await updateCompanyAction(repPayload.company.id, {
      representatives: representativeIds as unknown as CompanyRep[]
    });
  }

  return { id: userId, email: repPayload.email };
}

export async function updateCompanyAction(
  id: string,
  payload: Partial<Company>
): Promise<Company | null> {
  const res = await updateCompany(id, payload);
  return res as Company | null;
}

export async function setupCompanyAction(
  companyId: string,
  payload: Partial<Company>,
  selectedMasters: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch masters to get full master objects
    const masters = await fetchMastersAction();
    
    // Build category payload from selected master IDs
    const categoryPayload = masters
      .filter((m) => selectedMasters.includes(m.id))
      .map((m) => ({ master_id: m.id }));

    // Update company with all fields and set status to published
    const updatePayload: Partial<Company> = {
      ...payload,
      category: categoryPayload as unknown as Company['category'],
      status: "published",
    };

    const updated = await updateCompanyAction(companyId, updatePayload);
    
    if (!updated) {
      return { success: false, error: "Failed to update company" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error setting up company:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function uploadCompanyLogo(file: File) {
  return await uploadDirectusFile(file);
}

export async function addOptionToCompanyAction(companyId: string, optionId: string) {
  const company = await fetchCompanyByIdAction(companyId);

  if (!company) return null;

  // Build options array as junction table format
  let optionJunctions: Array<{ career_event_option_id: string }> = [];

  if (company.options) {
    // Handle both direct CareerEventOption and junction table format
    optionJunctions = (company.options as unknown[]).map((opt) => {
      if (opt && typeof opt === 'object' && 'career_event_option_id' in opt) {
        const junction = opt as { career_event_option_id: CareerEventOption | string | null };
        const optId = typeof junction.career_event_option_id === 'string'
          ? junction.career_event_option_id
          : junction.career_event_option_id?.id ?? '';
        return { career_event_option_id: optId };
      }
      // If it's a direct CareerEventOption, extract the id
      const option = opt as { id?: string };
      return { career_event_option_id: option.id ?? '' };
    }).filter(j => j.career_event_option_id);
  }

  // Add the new option (check if it's not already there)
  if (!optionJunctions.some(j => j.career_event_option_id === optionId)) {
    optionJunctions.push({ career_event_option_id: optionId });
  }

  // Check if the option being added is "Jobfair Package" and set page_on_platform to true
  // We need to fetch the option to get its name
  const { readItem } = await import("@directus/sdk");
  const { getDirectusWithToken } = await import("@/lib/directus");
  const directus = await getDirectusWithToken();

  let shouldSetPageOnPlatform = false;
  if (directus) {
    try {
      const option = await directus.request(
        readItem("career_event_option", optionId, {
          fields: ["name"],
        })
      ) as { name?: string } | null;

      if (option?.name === "Jobfair Package") {
        shouldSetPageOnPlatform = true;
      }
    } catch (error) {
      console.error("Error fetching option name:", error);
    }
  }

  const updatePayload: Partial<Company> = {
    options: optionJunctions as unknown as Company['options']
  };

  if (shouldSetPageOnPlatform) {
    updatePayload.page_on_platform = true;
  }

  return await updateCompanyAction(companyId, updatePayload);
}

export async function removeOptionFromCompanyAction(companyId: string, optionId: string) {
  const company = await fetchCompanyByIdAction(companyId);

  if (!company) return null;

  // Check if the option being removed is "Jobfair Package" and set page_on_platform to false
  const { readItem } = await import("@directus/sdk");
  const { getDirectusWithToken } = await import("@/lib/directus");
  const directus = await getDirectusWithToken();

  let isJobfairPackage = false;
  if (directus) {
    try {
      const option = await directus.request(
        readItem("career_event_option", optionId, {
          fields: ["name"],
        })
      ) as { name?: string } | null;

      if (option?.name === "Jobfair Package") {
        isJobfairPackage = true;
      }
    } catch (error) {
      console.error("Error fetching option name:", error);
    }
  }

  // Build options array as junction table format, excluding the option to remove
  let optionJunctions: Array<{ career_event_option_id: string }> = [];

  if (company.options) {
    // Handle both direct CareerEventOption and junction table format
    optionJunctions = (company.options as unknown[]).map((opt) => {
      if (opt && typeof opt === 'object' && 'career_event_option_id' in opt) {
        const junction = opt as { career_event_option_id: CareerEventOption | string | null };
        const optId = typeof junction.career_event_option_id === 'string'
          ? junction.career_event_option_id
          : junction.career_event_option_id?.id ?? '';
        return { career_event_option_id: optId };
      }
      // If it's a direct CareerEventOption, extract the id
      const option = opt as { id?: string };
      return { career_event_option_id: option.id ?? '' };
    }).filter(j => j.career_event_option_id && j.career_event_option_id !== optionId);
  }

  const updatePayload: Partial<Company> = {
    options: optionJunctions as unknown as Company['options']
  };

  // If removing Jobfair Package, set page_on_platform to false
  if (isJobfairPackage) {
    updatePayload.page_on_platform = false;
  }

  return await updateCompanyAction(companyId, updatePayload);
}

export async function removeUserFromCompanyAction(companyId: string, userId: string) {
  const company = await fetchCompanyByIdAction(companyId);

  if (!company) return { success: false, error: "Company not found" };

  // Build representatives array as string IDs, excluding the user to remove
  let representativeIds: string[] = [];

  if (company.representatives) {
    // If representatives is an array of objects with id property, extract the ids
    representativeIds = (company.representatives as (CompanyRep | string)[])
      .map((item: CompanyRep | string) => {
        return typeof item === 'string' ? item : item?.id ?? '';
      })
      .filter(id => id && id !== userId);
  }

  // Get the salesperson ID to reassign files to (if available)
  let reassignToUserId: string | null = null;
  if (company.salesperson) {
    if (typeof company.salesperson === 'string') {
      reassignToUserId = company.salesperson;
    } else if (typeof company.salesperson === 'object' && company.salesperson?.id) {
      reassignToUserId = company.salesperson.id;
    }
  }

  // Update company to remove the user from representatives first
  const updateResult = await updateCompanyAction(companyId, { representatives: representativeIds as unknown as CompanyRep[] });

  if (!updateResult) {
    return { success: false, error: "Failed to update company" };
  }

  // Try to delete the user from Directus
  // Files will be automatically reassigned to the company's salesperson (or current admin) before deletion
  const deleteResult = await deleteUser(userId, reassignToUserId || undefined);

  if (!deleteResult.success && deleteResult.error === "CONSTRAINT_ERROR") {
    // User couldn't be deleted due to foreign key constraints in other tables (not just files)
    // But they're already removed from the company
    return { success: true, warning: "User removed from company but could not be fully deleted from Directus due to existing references in other tables" };
  }

  return deleteResult.success
    ? { success: true }
    : { success: false, error: deleteResult.error || "Failed to delete user" };
}

// Fetch pending approval requests for the current salesperson
// This is a convenience wrapper that ensures we use the authenticated user's ID
// All authorization is handled in fetchPendingApprovalRequests()
export async function fetchPendingApprovalRequestsAction(): Promise<PendingApprovalRequest[]> {
  try {
    const user = await getUserFromCookies();
    if (!user || !user.id) {
      return [];
    }

    // fetchPendingApprovalRequests will validate authorization server-side
    // and ensure the user can only see their own requests (unless they're an admin)
    return await fetchPendingApprovalRequests(user.id);
  } catch (error) {
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error("Failed to fetch pending approval requests (action):", error.message, error.stack);
    } else {
      console.error("Failed to fetch pending approval requests (action) - non-Error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
    return [];
  }
}

// Helper function to create user from approved request (can be called from multiple places)
// This follows the same process as the first representative: creates user, sends invitation email with token
export async function createUserFromApprovedRequest(request: any): Promise<void> {
  try {
    if (!request.company?.id) {
      console.error("[createUserFromApprovedRequest] No company ID in request");
      return;
    }

    if (!request.email) {
      console.error("[createUserFromApprovedRequest] No email in request");
      return;
    }

    const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? 'directus'}_access`;
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE)?.value;

    if (!token) {
      console.error("[createUserFromApprovedRequest] No token available");
      return;
    }

    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) {
      console.error("[createUserFromApprovedRequest] DIRECTUS_URL not configured");
      return;
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Use server token if available for user operations (more reliable permissions)
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    const authToken = serverToken || token;

    // Fetch company details
    const company = await fetchCompanyByIdAction(request.company.id);
    if (!company) {
      console.error("[createUserFromApprovedRequest] Company not found:", request.company.id);
      return;
    }

    // Use default company rep role if role is not available in request
    const DEFAULT_COMPANY_REP_ROLE = "d5475bf4-a77f-48de-b06c-fac199b0f631";
    const userRole = request.role || DEFAULT_COMPANY_REP_ROLE;

    // Check if user already exists
    const checkUserRes = await fetch(
      `${normalizedBase}users?filter[email][_eq]=${encodeURIComponent(request.email)}&fields=id,status,role`,
      {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      }
    );

    let userId: string | undefined;
    let isNewUser = false;

    if (checkUserRes.ok) {
      const userData = await checkUserRes.json();
      const existingUser = userData.data?.[0];

      if (existingUser) {
        // User already exists - use existing user ID
        userId = existingUser.id;
        console.log(`[createUserFromApprovedRequest] User already exists: ${userId} (${request.email})`);
        
        // Update user status to "invited" if it's not already set
        // Also update role if needed
        try {
          const updatePayload: any = {};
          if (existingUser.status !== "invited") {
            updatePayload.status = "invited";
          }
          if (existingUser.role !== userRole) {
            updatePayload.role = userRole;
          }
          
          if (Object.keys(updatePayload).length > 0) {
            const updateUserRes = await fetch(
              `${normalizedBase}users/${userId}`,
              {
                method: "PATCH",
                headers: {
                  "Authorization": `Bearer ${authToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(updatePayload),
              }
            );
            
            if (!updateUserRes.ok) {
              console.warn(`[createUserFromApprovedRequest] Failed to update user status/role for ${userId}`);
            }
          }
        } catch (err) {
          console.warn(`[createUserFromApprovedRequest] Error updating existing user:`, err);
        }
      } else {
        // User doesn't exist, create it
        isNewUser = true;
        console.log(`[createUserFromApprovedRequest] Creating new user for ${request.email}`);
        
        const repPayload: Partial<CompanyRep> = {
          email: request.email,
          role: userRole,
          first_name: request.first_name || undefined,
          last_name: request.last_name || undefined,
          tel: request.tel || undefined,
          title: request.title || undefined,
          company: company,
        };

        const newRep = await createRep(repPayload);
        if (newRep && newRep.id) {
          userId = newRep.id;
          console.log(`[createUserFromApprovedRequest] User created successfully: ${userId}`);
          
          // Update rep details (name, etc.)
          await updateRep(newRep.id, {
            first_name: request.first_name || undefined,
            last_name: request.last_name || undefined,
            tel: request.tel || undefined,
            title: request.title || undefined,
          });
        } else {
          console.error(`[createUserFromApprovedRequest] Failed to create user for ${request.email}`);
          return; // Failed to create user
        }
      }
    } else {
      console.error(`[createUserFromApprovedRequest] Failed to check if user exists:`, checkUserRes.status);
      return;
    }

    if (!userId) {
      console.error(`[createUserFromApprovedRequest] No user ID available for ${request.email}`);
      return;
    }

    // Ensure user is in company's representatives list
    let representativeIds: string[] = [];
    if (company.representatives) {
      representativeIds = (company.representatives as (CompanyRep | string)[]).map((item: CompanyRep | string) => {
        return typeof item === 'string' ? item : item?.id ?? '';
      }).filter(Boolean);
    }

    if (!representativeIds.includes(userId)) {
      representativeIds.push(userId);
      await updateCompanyAction(request.company.id, {
        representatives: representativeIds as unknown as CompanyRep[]
      });
      console.log(`[createUserFromApprovedRequest] Added user ${userId} to company ${request.company.id}`);
    }

    // Send invitation email with invite token (same process as first rep)
    if (request.email && userId) {
      try {
        console.log(`[createUserFromApprovedRequest] Generating invite token for user ${userId} (${request.email})`);
        
        // Small delay to ensure user is fully created/updated in Directus
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Generate secure invite token
        const { generateInviteToken } = await import("@/lib/repos/users");
        const tokenData = await generateInviteToken(userId);

        if (tokenData && tokenData.token) {
          console.log(`[createUserFromApprovedRequest] Token generated successfully for ${request.email}`);
          
          // Build accept invite URL with token
          const frontendBaseUrl = process.env.NEXT_PUBLIC_APP_URL 
            || process.env.NEXT_PUBLIC_FORM_DOMAIN 
            || (process.env.DIRECTUS_URL ? process.env.DIRECTUS_URL.replace(/\/api.*$/, "") : "http://localhost:3000");
          
          const acceptInviteUrl = `${frontendBaseUrl}/accept-invite?token=${encodeURIComponent(tokenData.token)}`;
          
          // Send custom invitation email using our SMTP setup
          const { sendEmail } = await import("@/lib/repos/directus");
          const { generateInvitationEmailHtml } = await import("@/lib/email-templates");
          
          const emailHtml = generateInvitationEmailHtml({
            firstName: request.first_name ?? undefined,
            lastName: request.last_name ?? undefined,
            companyName: company.name,
            acceptInviteUrl,
          });
          
          await sendEmail({
            to: request.email,
            subject: `Welcome to VTK Career Platform${company.name ? ` - ${company.name}` : ''}`,
            html: emailHtml,
          });
          
          console.log(`[createUserFromApprovedRequest] Invitation email sent to ${request.email}`);
        } else {
          console.error(`[createUserFromApprovedRequest] Failed to generate invite token for user ${userId} (${request.email}) - tokenData is null or missing token`);
        }
      } catch (err) {
        console.error(`[createUserFromApprovedRequest] Error sending invitation email to ${request.email}:`, err);
        if (err instanceof Error) {
          console.error(`[createUserFromApprovedRequest] Error stack:`, err.stack);
        }
        // Don't throw - email failure shouldn't prevent user creation
      }
    }
  } catch (error) {
    console.error("[createUserFromApprovedRequest] Error creating user from approved request:", error);
    if (error instanceof Error) {
      console.error("[createUserFromApprovedRequest] Error stack:", error.stack);
    }
  }
}

// Approve or reject a rep request
export async function approveRepRequestAction(
  requestId: string,
  action: 'approve' | 'reject'
): Promise<{ success: boolean; error?: string }> {
  try {
    const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? 'directus'}_access`;
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE)?.value;

    if (!token) {
      return { success: false, error: "No token available" };
    }

    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) {
      return { success: false, error: "DIRECTUS_URL not configured" };
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Fetch the request to get details
    const getRequestRes = await fetch(
      `${normalizedBase}items/company_user_requests/${requestId}?fields=*,company.id`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    if (!getRequestRes.ok) {
      return { success: false, error: "Failed to fetch request" };
    }

    const requestData = await getRequestRes.json();
    const request = requestData.data;

    if (!request) {
      return { success: false, error: "Request not found" };
    }

    // Update status
    const status = action === "approve" ? "approved" : "rejected";
    const updateRes = await fetch(
      `${normalizedBase}items/company_user_requests/${requestId}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      }
    );

    if (!updateRes.ok) {
      const error = await updateRes.json().catch(() => null);
      console.error("Failed to update request status:", error);
      return { success: false, error: "Failed to update request status" };
    }

    // If approved, create the user and add to company (if not already created)
    if (action === "approve") {
      await createUserFromApprovedRequest(request);
    }

    return { success: true };
  } catch (error) {
    console.error("Error in approveRepRequestAction:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function requestCompanyPageAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUserFromCookies();
    if (!user || !user.company) {
      return { success: false, error: "User not authenticated or no company associated" };
    }

    const company = await fetchCompanyByIdAction(user.company.id);
    if (!company) {
      return { success: false, error: "Company not found" };
    }

    // Check if company already has a page
    if (company.page_on_platform) {
      return { success: false, error: "Company already has a page on the platform" };
    }

    // Get salesperson email
    let salespersonEmail: string | null = null;
    let salespersonName: string = "Salesperson";

    if (company.salesperson) {
      const baseUrl = process.env.DIRECTUS_URL;
      if (!baseUrl) {
        return { success: false, error: "DIRECTUS_URL not configured" };
      }

      const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";
      const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
      
      if (!serverToken) {
        return { success: false, error: "Server configuration error" };
      }

      const salespersonId = typeof company.salesperson === "string" 
        ? company.salesperson 
        : company.salesperson.id;

      try {
        const salespersonRes = await fetch(
          `${normalizedBase}users/${salespersonId}?fields=id,email,first_name,last_name`,
          {
            headers: {
              "Authorization": `Bearer ${serverToken}`,
            },
          }
        );

        if (salespersonRes.ok) {
          const salespersonData = await salespersonRes.json();
          const salesperson = salespersonData.data;
          salespersonEmail = salesperson.email;
          salespersonName = [salesperson.first_name, salesperson.last_name]
            .filter(Boolean)
            .join(" ") || "Salesperson";
        }
      } catch (err) {
        console.error("Error fetching salesperson:", err);
      }
    }

    if (!salespersonEmail) {
      return { success: false, error: "Salesperson email not found" };
    }

    // Get requester info
    const requesterName = user.name || user.email;
    const requesterEmail = user.email;

    // Generate email HTML
    const emailHtml = generateCompanyPageRequestEmailHtml({
      companyName: company.name,
      requesterName,
      requesterEmail,
      salespersonName,
    });

    // Send email to salesperson
    await sendEmail({
      to: salespersonEmail,
      subject: `Company Page Request: ${company.name}`,
      html: emailHtml,
    });

    return { success: true };
  } catch (error) {
    console.error("Error in requestCompanyPageAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}