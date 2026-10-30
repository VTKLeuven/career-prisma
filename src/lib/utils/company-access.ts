// lib/utils/company-access.ts
//
// What a company may do, from the grants on the sub-options it bought
// (lib/grants.ts). Access used to be decided by sub-option *names* -- "CV
// Book", "Company Page On Platform", "Student Schedules", "Extra Booth", and
// anything containing both "matching" and "software" -- resolved through four
// Directus-era shapes of the sub-option junctions. Renaming a sub-option
// silently switched the feature off for every company. Names are now labels;
// the grants decide.
//
// These checks are synchronous and run in client components too, so they read
// `company.grants`: the grant types the company holds this academic year,
// worked out by shapeCompany() in lib/repos/_shape.ts from the sub-options it
// bought directly and those inside the packages it bought. CV books, kept for
// good, are not checked here but across all years in lib/repos/cv-book.ts.
import type { GrantType } from "@/lib/grants";

/** Minimal company shape for access checks: its grants this year and its status. */
type CompanyLike = { grants?: string[]; status?: string } | null | undefined;

/** Whether the company holds this grant in the current academic year. */
export function hasGrant(company: CompanyLike, type: GrantType): boolean {
  return Array.isArray(company?.grants) && company.grants.includes(type);
}

/** Whether the company may see the students it was matched with. */
export function hasMatchingSoftwareAccess(company: CompanyLike): boolean {
  return hasGrant(company, "matching_software");
}

/**
 * Whether the company's public page (/company/<name>) is live. There is no
 * page to create: it renders from what the company filled in under Settings
 * -> Information as soon as both hold -- the company is published (an admin
 * switch in /admin/companies, to hide a page that is paid for) and it holds
 * the company-page grant this year.
 */
export function hasCompanyPageAccess(company: CompanyLike): boolean {
  if (!company) return false;
  if (company.status !== "published") return false;
  return hasGrant(company, "company_page");
}
