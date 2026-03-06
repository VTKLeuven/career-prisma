// lib/utils/company-access.ts
import type { Company, CareerEventOption, CareerSubOption } from "@/lib/schema";

/** Resolve sub-option from various Directus formats */
function resolveSubOption(subOpt: unknown): CareerSubOption | null {
  if (!subOpt || typeof subOpt !== 'object') return null;
  if ('career_sub_option_id' in subOpt) {
    const ref = (subOpt as { career_sub_option_id: CareerSubOption | string | null }).career_sub_option_id;
    if (ref && typeof ref === 'object' && 'name' in ref) return ref as CareerSubOption;
  }
  if ('career_sub_option' in subOpt) {
    const ref = (subOpt as { career_sub_option: CareerSubOption | string | null }).career_sub_option;
    if (ref && typeof ref === 'object' && 'name' in ref) return ref as CareerSubOption;
  }
  if ('name' in subOpt) return subOpt as CareerSubOption;
  return null;
}

/** Collect suboption IDs from an array (handles IDs as numbers or strings) */
function collectSubOptionIds(arr: unknown[]): string[] {
  return arr
    .map((s) => {
      if (typeof s === 'string') return s;
      if (typeof s === 'number') return String(s);
      if (s && typeof s === 'object' && 'id' in s) return String((s as { id: string | number }).id);
      return null;
    })
    .filter((id): id is string => id != null && id !== '');
}

/** Resolve sub_options array to CareerSubOption[] (handles IDs, objects with career_sub_option_id, etc.) */
function resolveSubOptionsArray(
  subOpts: unknown[],
  allSubOptions?: CareerSubOption[]
): CareerSubOption[] {
  const result: CareerSubOption[] = [];
  const seen = new Set<string>();
  const add = (resolved: CareerSubOption | null) => {
    if (resolved && !seen.has(resolved.id || resolved.name)) {
      seen.add(resolved.id || resolved.name);
      result.push(resolved);
    }
  };
  const resolveIds = (ids: string[]) => {
    if (!allSubOptions || ids.length === 0) return;
    const byId = new Map<string, CareerSubOption>();
    for (const s of allSubOptions) {
      const k = String(s.id);
      byId.set(k, s);
      if (k !== s.id) byId.set(s.id as string, s);
    }
    for (const id of ids) {
      add(byId.get(id) ?? byId.get(String(id)) ?? null);
    }
  };
  for (const s of subOpts) {
    const resolved = resolveSubOption(s);
    if (resolved) add(resolved);
  }
  resolveIds(collectSubOptionIds(subOpts));
  return result;
}

/** Get sub_options to check: junction, option.sub_options, and option.events[].career_event_option_id.sub_options (nested). Handles IDs when allSubOptions provided. */
function getSubOptionsToCheck(
  opt: unknown,
  option: CareerEventOption | null,
  allSubOptions?: CareerSubOption[]
): CareerSubOption[] {
  const result: CareerSubOption[] = [];
  const seen = new Set<string>();
  const add = (resolved: CareerSubOption | null) => {
    if (resolved && !seen.has(resolved.id || resolved.name)) {
      seen.add(resolved.id || resolved.name);
      result.push(resolved);
    }
  };
  const resolveIds = (ids: string[]) => {
    if (!allSubOptions || ids.length === 0) return;
    const byId = new Map<string, CareerSubOption>();
    for (const s of allSubOptions) {
      const k = String(s.id);
      byId.set(k, s);
      if (k !== s.id) byId.set(s.id as string, s);
    }
    for (const id of ids) {
      add(byId.get(id) ?? byId.get(String(id)) ?? null);
    }
  };

  // 1) Junction's sub_options (company's selected sub_options)
  const rawOpt = opt as Record<string, unknown> | null;
  const junctionSubOpts = (rawOpt?.sub_options ?? rawOpt?.career_sub_options) as unknown[] | undefined;
  if (Array.isArray(junctionSubOpts)) {
    for (const s of junctionSubOpts) {
      const resolved = resolveSubOption(s);
      if (resolved) add(resolved);
    }
    resolveIds(collectSubOptionIds(junctionSubOpts));
  }

  // 2) Option's sub_options (can be IDs [7,8,9,18] or objects)
  const optSubOpts = option?.sub_options;
  if (Array.isArray(optSubOpts)) {
    for (const s of optSubOpts) {
      const resolved = resolveSubOption(s);
      if (resolved) add(resolved);
    }
    resolveIds(collectSubOptionIds(optSubOpts));
  }

  // 3) Nested: option.events[].career_event_option_id.sub_options (Directus nests sub_options in events junction)
  const events = option?.events;
  if (Array.isArray(events)) {
    for (const ev of events) {
      const nested = ev as Record<string, unknown>;
      const nestedOpt = nested?.career_event_option_id as { sub_options?: unknown[] } | undefined;
      const nestedSubOpts = nestedOpt?.sub_options;
      if (Array.isArray(nestedSubOpts)) {
        for (const s of nestedSubOpts) {
          const resolved = resolveSubOption(s);
          if (resolved) add(resolved);
        }
        resolveIds(collectSubOptionIds(nestedSubOpts));
      }
    }
  }

  return result;
}

/**
 * Check if a company has access to a specific sub-option by name
 * @param company The company to check
 * @param subOptionName The name of the sub-option to check (e.g., "CV Book")
 * @param allSubOptions Optional list to resolve sub_options when they're returned as IDs
 * @returns The sub-option if found and active, null otherwise
 */
export function getCompanySubOption(
  company: Company | null | undefined,
  subOptionName: string,
  allSubOptions?: CareerSubOption[]
): CareerSubOption | null {
  const match = subOptionName.toLowerCase().trim();

  // 1) Company-level sub_options (company_career_sub_option junction)
  const companySubs = (company as { sub_options?: unknown[] })?.sub_options;
  if (Array.isArray(companySubs) && companySubs.length > 0) {
    const resolved = resolveSubOptionsArray(companySubs, allSubOptions);
    const found = resolved.find(
      (s) =>
        s?.name &&
        typeof s.name === "string" &&
        s.name.toLowerCase().trim() === match &&
        "active" in s &&
        (s as CareerSubOption).active === true
    );
    if (found) return found;
  }

  if (!company?.options || !Array.isArray(company.options)) {
    return null;
  }

  for (const opt of company.options) {
    if (!opt) continue;

    let option: CareerEventOption | null = null;
    if (typeof opt === 'object' && 'career_event_option_id' in opt) {
      option = (opt as { career_event_option_id: CareerEventOption }).career_event_option_id;
    } else if (typeof opt === 'object' && 'id' in opt) {
      option = opt as CareerEventOption;
    }

    const subOpts = getSubOptionsToCheck(opt, option, allSubOptions);
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
 * @param allSubOptions Optional list to resolve sub_options when they're returned as IDs
 * @returns The sub-option if found, null otherwise
 */
export function getCompanySubOptionAnyStatus(
  company: Company | null | undefined,
  subOptionName: string,
  allSubOptions?: CareerSubOption[]
): CareerSubOption | null {
  const match = subOptionName.toLowerCase().trim();

  // 1) Company-level sub_options (company_career_sub_option junction)
  const companySubs = (company as { sub_options?: unknown[] })?.sub_options;
  if (Array.isArray(companySubs) && companySubs.length > 0) {
    const resolved = resolveSubOptionsArray(companySubs, allSubOptions);
    const found = resolved.find(
      (s) => s?.name && typeof s.name === "string" && s.name.toLowerCase().trim() === match
    );
    if (found) return found;
  }

  if (!company?.options || !Array.isArray(company.options)) {
    return null;
  }

  for (const opt of company.options) {
    if (!opt) continue;

    let option: CareerEventOption | null = null;
    if (typeof opt === 'object' && 'career_event_option_id' in opt) {
      option = (opt as { career_event_option_id: CareerEventOption }).career_event_option_id;
    } else if (typeof opt === 'object' && 'id' in opt) {
      option = opt as CareerEventOption;
    }

    const subOpts = getSubOptionsToCheck(opt, option, allSubOptions);
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

/** Minimal company shape for access checks (options, sub_options, status) */
type CompanyLike = { options?: unknown[]; sub_options?: unknown[]; status?: string } | null | undefined;

/**
 * Check if a company has access to view their company page (public profile)
 * Requires: published status AND the "Company Page On Platform" sub-option (company.sub_options or in options).
 * @param company The company to check (Company or minimal { options, sub_options, status })
 * @param allSubOptions Optional list to resolve sub_options when they're returned as IDs (e.g. [7,8,9,18])
 * @returns true if company can view their company page
 */
export function hasCompanyPageAccess(company: CompanyLike, allSubOptions?: CareerSubOption[]): boolean {
  if (!company) return false;
  if (company.status !== "published") return false;
  const companyPageSub = getCompanySubOptionAnyStatus(company as Company | null | undefined, "Company Page On Platform", allSubOptions);
  return companyPageSub !== null;
}

