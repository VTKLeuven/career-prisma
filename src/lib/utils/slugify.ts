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
export function slugifyEventName(name?: string | null): string {
  return slugifyCompanyName(name);
}

/** Slug for speaker (first_name + last_name). Use for speaker page URLs. */
export function slugifySpeakerName(firstName?: string | null, lastName?: string | null): string {
  const full = [firstName, lastName].filter(Boolean).join(" ").trim();
  return slugifyCompanyName(full) || "speaker";
}

/** Get unique slug for a speaker. When multiple speakers share the same name, appends short id. */
export function getSpeakerSlug(
  speaker: { id: string; representative?: { first_name?: string | null; last_name?: string | null } | null },
  allSpeakers: Array<{ id: string; representative?: { first_name?: string | null; last_name?: string | null } | null }>
): string {
  const base = slugifySpeakerName(speaker.representative?.first_name, speaker.representative?.last_name);
  const sameName = allSpeakers.filter(
    (s) => slugifySpeakerName(s.representative?.first_name, s.representative?.last_name) === base
  );
  if (sameName.length <= 1) return base;
  return `${base}-${speaker.id.slice(0, 8)}`;
}

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

