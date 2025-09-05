// app/actions/companies.ts
"use server";
import { listCompanies, createCompany } from "@/lib/repos/company";
import { createRep } from "@/lib/repos/users";
import { Company } from "@/lib/schema";
import { DirectusUser } from "@directus/sdk";

const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;

function formatAddress(c: any) {
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
  const companies = await listCompanies({ limit: 50, sort: "name" }) ?? [];

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
  }));
}

export async function createCompanyAction(companyPayload: Partial<Company>, repPayload: Partial<DirectusUser>) {
  await createCompany(companyPayload);
  await createRep(repPayload);
  return
}
