// lib/utils/company-access.ts
import type { Company, CareerEventOption, CareerSubOption } from "@/lib/schema";

/** Resolve sub-option from various Directus formats */
function resolveSubOption(subOpt: unknown): CareerSubOption | null {
  if (!subOpt || typeof subOpt !== 'object') return null;
  if ('career_sub_option_id' in subOpt) {
    const ref = (subOpt as { career_sub_option_id: CareerSubOption | string | null }).career_sub_option_id;
    if (ref && typeof ref === 'object' && 'name' in ref) return ref as CareerSubOption;
  }
  if ('name' in subOpt) return subOpt as CareerSubOption;
  return null;
}

/** Get sub_options to check: prefer junction's sub_options (company's selected), else option's sub_options */
function getSubOptionsToCheck(opt: unknown, option: CareerEventOption | null): CareerSubOption[] {
  const result: CareerSubOption[] = [];
  // Junction's sub_options (company's selected sub_options for this option)
  if (opt && typeof opt === 'object' && 'sub_options' in opt) {
    const subOpts = (opt as { sub_options?: unknown[] }).sub_options;
    if (Array.isArray(subOpts)) {
      for (const s of subOpts) {
        const resolved = resolveSubOption(s);
        if (resolved) result.push(resolved);
      }
    }
  }
  // Fallback: option's sub_options (all sub_options of this option type - backward compatibility)
  if (result.length === 0 && option?.sub_options && Array.isArray(option.sub_options)) {
    for (const s of option.sub_options) {
      const resolved = resolveSubOption(s);
      if (resolved) result.push(resolved);
    }
  }
  return result;
}

/**
 * Check if a company has access to a specific sub-option by name
 * @param company The company to check
 * @param subOptionName The name of the sub-option to check (e.g., "CV Book")
 * @returns The sub-option if found and active, null otherwise
 */
export function getCompanySubOption(
  company: Company | null | undefined,
  subOptionName: string
): CareerSubOption | null {
  if (!company?.options || !Array.isArray(company.options)) {
    return null;
  }

  const match = subOptionName.toLowerCase().trim();

  for (const opt of company.options) {
    if (!opt) continue;

    let option: CareerEventOption | null = null;
    if (typeof opt === 'object' && 'career_event_option_id' in opt) {
      option = (opt as { career_event_option_id: CareerEventOption }).career_event_option_id;
    } else if (typeof opt === 'object' && 'id' in opt) {
      option = opt as CareerEventOption;
    }

    const subOpts = getSubOptionsToCheck(opt, option);
    for (const subOption of subOpts) {
      if (
        subOption &&
        'name' in subOption &&
        typeof subOption.name === 'string' &&
        subOption.name.toLowerCase().trim() === match &&
        'active' in subOption &&
        subOption.active === true
      ) {
        return subOption;
      }
    }
  }

  return null;
}

/**
 * Get a sub-option by name regardless of active status (useful for getting price info)
 * @param company The company to check
 * @param subOptionName The name of the sub-option to check (e.g., "CV Book")
 * @returns The sub-option if found, null otherwise
 */
export function getCompanySubOptionAnyStatus(
  company: Company | null | undefined,
  subOptionName: string
): CareerSubOption | null {
  if (!company?.options || !Array.isArray(company.options)) {
    return null;
  }

  const match = subOptionName.toLowerCase().trim();

  for (const opt of company.options) {
    if (!opt) continue;

    let option: CareerEventOption | null = null;
    if (typeof opt === 'object' && 'career_event_option_id' in opt) {
      option = (opt as { career_event_option_id: CareerEventOption }).career_event_option_id;
    } else if (typeof opt === 'object' && 'id' in opt) {
      option = opt as CareerEventOption;
    }

    const subOpts = getSubOptionsToCheck(opt, option);
    for (const subOption of subOpts) {
      if (
        subOption &&
        'name' in subOption &&
        typeof subOption.name === 'string' &&
        subOption.name.toLowerCase().trim() === match
      ) {
        return subOption;
      }
    }
  }

  return null;
}

/**
 * Check if a company has access to CV Book
 * @param company The company to check
 * @returns true if company has CV Book sub-option and it's active, false otherwise
 */
export function hasCVBookAccess(company: Company | null | undefined): boolean {
  return getCompanySubOption(company, "CV Book") !== null;
}

/** Minimal company shape for access checks (options, page_on_platform, status) */
type CompanyLike = { options?: unknown[]; page_on_platform?: boolean; status?: string } | null | undefined;

/**
 * Check if a company has access to view their company page (public profile)
 * Requires: page_on_platform, published status, and "Company Page" sub-option when that sub-option exists
 * @param company The company to check (Company or minimal { options, page_on_platform, status })
 * @returns true if company can view their company page
 */
export function hasCompanyPageAccess(company: CompanyLike): boolean {
  if (!company) return false;
  if (company.status !== "published") return false;
  if (!company.page_on_platform) return false;
  // Check "Company Page On Platform" sub-option: if company has it, require it; else allow (backward compat)
  const companyPageSub = getCompanySubOption(company as Company | null | undefined, "Company Page On Platform");
  // When sub-option exists and is used, require it; when not used, allow page_on_platform alone
  const optionHasCompanyPageSub = (company.options ?? []).some((opt) => {
    let option: CareerEventOption | null = null;
    if (typeof opt === "object" && opt && "career_event_option_id" in opt) {
      option = (opt as { career_event_option_id: CareerEventOption }).career_event_option_id;
    } else if (typeof opt === "object" && opt && "id" in opt) {
      option = opt as CareerEventOption;
    }
    const subOpts = option?.sub_options ?? [];
    return subOpts.some((s) => resolveSubOption(s)?.name?.toLowerCase() === "company page on platform");
  });
  if (optionHasCompanyPageSub && !companyPageSub) return false;
  return true;
}

