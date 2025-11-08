// app/actions/companies.ts
"use server";
import { listCompanies, getCompanyById, createCompany, updateCompany } from "@/lib/repos/company";
import { createRep, updateRep, waitForApproval, deleteUser } from "@/lib/repos/users";
import { Company, CompanyRep, CareerEventOption } from "@/lib/schema";
import { uploadDirectusFile } from "@/lib/repos/directus";



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
    const updatedRep = await updateRep(newRep.id, {
      first_name: repPayload.first_name,
      last_name: repPayload.last_name,
    });

    // Create a mutable payload with representatives as string array for the API
    const payload = {
      ...companyPayload,
      representatives: [updatedRep.id] as unknown as CompanyRep[]
    };

    return await createCompany(payload as Partial<Company>);
  }
  return await createCompany(companyPayload);
}

export async function createCompanyRepAction(companyId: string, repPayload: Partial<CompanyRep>) {
  if (!repPayload) return null;
  const newRep = await createRep(repPayload);
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

  return await updateCompanyAction(companyId, {representatives: representativeIds as unknown as CompanyRep[]});
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

  // 1️⃣ Create approval request and wait for salesperson’s approval
  const approved = await waitForApproval(salespersonId, repPayload);

  if (!approved) {
    console.log("Rep request was rejected or expired");
    return { status: "rejected" };
  }

  // 2️⃣ Once approved, create Directus user
  const newRep = await createRep(repPayload);

  // 3️⃣ Optionally update the rep data (name, etc.)
  await updateRep(newRep.id, {
    first_name: repPayload.first_name,
    last_name: repPayload.last_name,
  });

  return newRep;
}

export async function updateCompanyAction(
  id: string,
  payload: Partial<Company>
): Promise<Company | null> {
  const res = await updateCompany(id, payload);
  return res as Company | null;
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