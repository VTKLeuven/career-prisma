export function getDirectusImageUrl(
  file?: string | { id?: string } | null,
  options?: { width?: number; height?: number; quality?: number }
): string | undefined {
  if (!file) return undefined;

  const fileId = typeof file === "string" ? file : file.id;
  if (!fileId) return undefined;

  let url = `${process.env.NEXT_PUBLIC_DIRECTUS_URL}assets/${fileId}`;

  if (options) {
    const params = new URLSearchParams();
    if (options.width) params.set("width", options.width.toString());
    if (options.height) params.set("height", options.height.toString());
    if (options.quality) params.set("quality", options.quality.toString());
    url += `?${params.toString()}`;
  }

  return url;
}