// lib/utils/company-access.ts
import type { Company, CareerEventOption, CareerSubOption } from "@/lib/schema";

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

  // Iterate through company options
  for (const opt of company.options) {
    if (!opt) continue;

    // Handle junction table format (options can be junction table entries)
    let option: CareerEventOption | null = null;
    if (typeof opt === 'object' && 'career_event_option_id' in opt) {
      option = (opt as { career_event_option_id: CareerEventOption }).career_event_option_id;
    } else if (typeof opt === 'object' && 'id' in opt) {
      option = opt as CareerEventOption;
    }

    if (!option?.sub_options || !Array.isArray(option.sub_options)) {
      continue;
    }

    // Check if any sub-option matches the name and is active
    // Sub-options can be direct objects or wrapped in career_sub_option_id
    for (const subOpt of option.sub_options) {
      if (!subOpt || typeof subOpt !== 'object') continue;

      // Handle junction table format: sub_options can have career_sub_option_id wrapper
      let subOption: CareerSubOption | null = null;
      if ('career_sub_option_id' in subOpt) {
        const subOptId = (subOpt as { career_sub_option_id: CareerSubOption | string | null }).career_sub_option_id;
        if (subOptId && typeof subOptId === 'object') {
          subOption = subOptId as CareerSubOption;
        }
      } else if ('name' in subOpt) {
        // Direct sub-option object
        subOption = subOpt as CareerSubOption;
      }

      if (
        subOption &&
        'name' in subOption &&
        typeof subOption.name === 'string' &&
        subOption.name.toLowerCase().trim() === subOptionName.toLowerCase().trim() &&
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

  // Iterate through company options
  for (const opt of company.options) {
    if (!opt) continue;

    // Handle junction table format (options can be junction table entries)
    let option: CareerEventOption | null = null;
    if (typeof opt === 'object' && 'career_event_option_id' in opt) {
      option = (opt as { career_event_option_id: CareerEventOption }).career_event_option_id;
    } else if (typeof opt === 'object' && 'id' in opt) {
      option = opt as CareerEventOption;
    }

    if (!option?.sub_options || !Array.isArray(option.sub_options)) {
      continue;
    }

    // Check if any sub-option matches the name (regardless of active status)
    // Sub-options can be direct objects or wrapped in career_sub_option_id
    for (const subOpt of option.sub_options) {
      if (!subOpt || typeof subOpt !== 'object') continue;

      // Handle junction table format: sub_options can have career_sub_option_id wrapper
      let subOption: CareerSubOption | null = null;
      if ('career_sub_option_id' in subOpt) {
        const subOptId = (subOpt as { career_sub_option_id: CareerSubOption | string | null }).career_sub_option_id;
        if (subOptId && typeof subOptId === 'object') {
          subOption = subOptId as CareerSubOption;
        }
      } else if ('name' in subOpt) {
        // Direct sub-option object
        subOption = subOpt as CareerSubOption;
      }

      if (
        subOption &&
        'name' in subOption &&
        typeof subOption.name === 'string' &&
        subOption.name.toLowerCase().trim() === subOptionName.toLowerCase().trim()
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

