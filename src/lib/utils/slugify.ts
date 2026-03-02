/**
 * Convert a company name to a URL-friendly slug
 * Normalizes accents (é→e, ü→u) and replaces spaces/special chars with hyphens
 * Examples:
 *   "Company Name" -> "company-name"
 *   "Café & Co." -> "cafe-co"
 *   "École" -> "ecole"
 */
export function slugifyCompanyName(name?: string | null): string {
  return (name ?? "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "") // Remove diacritics (é→e, ü→u)
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, "-") // Replace special characters with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/** Alias for event names - same normalization as company names */
export const slugifyEventName = slugifyCompanyName;

/** Normalize string for case+accent-insensitive matching (e.g. "Café" matches "cafe") */
export function normalizeForMatching(str?: string | null): string {
  return (str ?? "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "");
}

/** UTF-8 BOM for CSV - ensures Excel displays special characters correctly */
export const CSV_UTF8_BOM = "\uFEFF";

