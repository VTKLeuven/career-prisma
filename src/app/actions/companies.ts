// app/actions/companies.ts
"use server";
import { listCompanies, getCompanyById, createCompany, updateCompany } from "@/lib/repos/company";
import { createRep, updateRep, waitForApproval } from "@/lib/repos/users";
import { CareerEventOption, Company, CompanyRep } from "@/lib/schema";
import { uploadDirectusFile } from "@/lib/repos/directus";


const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;

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
    salesperson: c.salesperson,

    // Include options so you can access events
    options: c.options ?? [],
  }));
}

export async function fetchCompanyByIdAction(company_id: string) {
  const company = (await getCompanyById(company_id)) ?? null;

  if (!company) return null;

  company.options = company.options?.map((item: any) => {
    const option = item.career_event_option_id;
    return option;
  }) ?? [];

  company.category = company.category?.map((item: any) => {
    const cat = item.master_id;
    return cat;
  }) ?? [];

  return company
}

export async function createCompanyAction(companyPayload: Partial<Company>, repPayload: Partial<CompanyRep>) {
  if (repPayload) {
    const newRep = await createRep(repPayload);
    const updatedRep = await updateRep(newRep.id, {
      first_name: repPayload.first_name,
      last_name: repPayload.last_name,
    });
    // Ensure representatives is an array, then add the new rep's ID
    if (!companyPayload.representatives) {
      companyPayload.representatives = [];
    }

    // If it's a string (single ID), convert it to array
    if (typeof companyPayload.representatives === "string") {
      companyPayload.representatives = [companyPayload.representatives];
    }

    // Add the new rep
    companyPayload.representatives.push(updatedRep.id);
  }
  return await createCompany(companyPayload);
}

export async function requestRepAction(repPayload: Partial<CompanyRep>) {
  if (!repPayload) throw new Error("No rep payload");

  const salespersonId = typeof repPayload?.company?.salesperson === "string"
    ? repPayload.company.salesperson
    : repPayload?.company?.salesperson?.id;

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
  const updatedRep = await updateRep(newRep.id, {
    first_name: repPayload.first_name,
    last_name: repPayload.last_name,
  });

  return updatedRep
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