// Allowed file types for form file fields. Each entry is either an extension
// (".pdf") or a MIME type ("application/pdf", "image/*"), which is also what
// an <input type="file"> accept attribute takes.

/** Turns admin input like "PDF, .png;svg" into [".pdf", ".png", ".svg"]. */
export function parseAllowedFileTypes(text: string): string[] {
  const types = text
    .split(/[\s,;]+/)
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean)
    .map((type) => (type.includes("/") || type.startsWith(".") ? type : `.${type}`));
  return Array.from(new Set(types));
}

export function fileMatchesAllowedTypes(file: File, allowedTypes: string[]): boolean {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  return allowedTypes.some((raw) => {
    const type = raw.toLowerCase();
    if (type.endsWith("/*")) return mime.startsWith(type.slice(0, -1));
    if (type.includes("/")) return mime === type;
    return name.endsWith(type);
  });
}
