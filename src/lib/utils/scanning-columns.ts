/**
 * Utilities for extracting display values from form response data
 * using scanning_columns configuration from form version metadata.
 */

export type ScanningColumns = {
  university?: string;
  faculty?: string;
  master?: string;
  year_of_study?: string;
};

/** Extract a display string from a form field value (handles objects, arrays, etc.) */
function extractDisplayValue(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string" && val.trim()) return val.trim();
  if (typeof val === "object" && val !== null && "name" in (val as object))
    return String((val as { name: string }).name).trim() || "";
  if (typeof val === "object" && val !== null) {
    const o = val as Record<string, unknown>;
    const v = o.name ?? o.label ?? o.value ?? o.id;
    if (v != null && String(v).trim()) return String(v).trim();
  }
  if (Array.isArray(val)) {
    const parts = val.map(extractDisplayValue).filter(Boolean);
    return parts.join(", ");
  }
  return String(val).trim();
}

/** Get display values for University, Faculty, Master, Year of study from form data using scanning_columns config */
export function getScanningDisplayValues(
  data: Record<string, unknown>,
  scanningColumns?: ScanningColumns | null
): { university: string; faculty: string; master: string; yearOfStudy: string } {
  const empty = { university: "", faculty: "", master: "", yearOfStudy: "" };
  if (!scanningColumns || typeof scanningColumns !== "object") {
    return empty;
  }

  return {
    university: scanningColumns.university
      ? extractDisplayValue(data[scanningColumns.university])
      : "",
    faculty: scanningColumns.faculty
      ? extractDisplayValue(data[scanningColumns.faculty])
      : "",
    master: scanningColumns.master
      ? extractDisplayValue(data[scanningColumns.master])
      : "",
    yearOfStudy: scanningColumns.year_of_study
      ? extractDisplayValue(data[scanningColumns.year_of_study])
      : "",
  };
}

/** Check if any scanning column is configured */
export function hasScanningColumns(scanningColumns?: ScanningColumns | null): boolean {
  if (!scanningColumns || typeof scanningColumns !== "object") return false;
  return !!(
    scanningColumns.university ||
    scanningColumns.faculty ||
    scanningColumns.master ||
    scanningColumns.year_of_study
  );
}
