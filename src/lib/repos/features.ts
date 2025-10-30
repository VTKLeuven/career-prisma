// lib/repos/features.ts
import { directus, getDirectusWithToken } from "@/lib/directus"
import type { Floorplan, Booth, Master } from "@/lib/schema"
import { readItems } from "@directus/sdk"

export async function listBooths(
  floorplan: Floorplan,
  opts?: {
    search?: string
    limit?: number
    page?: number        // 1-based
    sort?: string        // e.g. "-date_created" or "name"
  }
): Promise<Booth[] | null> {
  try {
    if (!floorplan?.id) return []

    const { search, limit = 300, page = 1, sort = "booth_number" } = opts ?? {}
    return directus.request(
      readItems("Booths", {
        fields: ["*", "*.*", "*.*.*", "*.*.*.*"],
        limit,
        page,
        sort,
        filter: {
          Floorplan: {
            _eq: floorplan.id, // only booths for this floorplan
          },
        },
        ...(search
          ? { search } // optional full-text search
          : {}),
      })
    ) as unknown as Booth[]
  } catch (error) {
    console.error("Failed to fetch booths:", error)
    return null
  }
}

export async function listMasters(
  opts?: {
    search?: string
    limit?: number
    page?: number        // 1-based
    sort?: string        // e.g. "-date_created" or "name"
  }
): Promise<Master[] | null> {
  try {
    const { search, limit = 300, page = 1, sort = "id" } = opts ?? {}
    return directus.request(
      readItems("master", {
        fields: ["*"],
        limit,
        page,
        sort,
        ...(search
          ? { search } // optional full-text search
          : {}),
      })
    ) as unknown as Master[]
  } catch (error) {
    console.error("Failed to fetch masters:", error)
    return null
  }
}