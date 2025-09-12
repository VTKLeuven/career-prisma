// lib/repos/directus.ts

export function getDirectusImageUrl(id: string) {
    console.log(process.env)
  return `${process.env.NEXT_PUBLIC_DIRECTUS_URL}assets/${id}`;
}