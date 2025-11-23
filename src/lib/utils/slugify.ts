/**
 * Convert a company name to a URL-friendly slug
 * Replaces spaces and special characters with hyphens
 * Examples:
 *   "Company Name" -> "company-name"
 *   "Company+Name" -> "company-name"
 *   "Company & Co." -> "company-co"
 */
export function slugifyCompanyName(name?: string | null): string {
  return (name ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, "-") // Replace special characters with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

