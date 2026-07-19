export function getFileUrl(
  file?: string | { id?: string } | null,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    /** Retained for call-site compatibility; local file serving ignores transforms. */
    fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  }
): string | undefined {
  if (!file) return undefined;

  const fileId = typeof file === "string" ? file : file.id;
  if (!fileId) return undefined;

  void options;
  return `/api/files/${encodeURIComponent(fileId)}`;
}
