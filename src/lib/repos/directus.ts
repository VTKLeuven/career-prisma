// lib/repos/directus.ts

export function getDirectusImageUrl(id: string) {
  return `${process.env.NEXT_PUBLIC_DIRECTUS_URL}assets/${id}`;
}