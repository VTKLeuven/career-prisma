// app/actions/companies.ts
"use server";
import { listCompanies, getCompanyById, createCompany, updateCompany } from "@/lib/repos/company";
import { createRep, updateRep, waitForApproval } from "@/lib/repos/users";
import { Company, CompanyRep } from "@/lib/schema";
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
        : "Not set",

    // Include options so you can access events
    options: c.options ?? [],
    representatives: c.representatives ?? [],
  }));
}

export async function fetchCompanyByIdAction(company_id: string): Promise<Company | null> {
  const company = (await getCompanyById(company_id)) as Company | null;
  return company;
}

export async function createCompanyAction(companyPayload: Partial<Company>, repPayload: Partial<CompanyRep>) {
  if (repPayload) {
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

