// lib/repos/features.ts
import { getServerDirectusClient } from "@/lib/directus"
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

    const client = await getServerDirectusClient()
    if (!client) return null

    const { search, limit = -1, page = 1, sort = "booth_number" } = opts ?? {}
    return client.request(
      readItems("Booths", {
        fields: [
          "*",
          "*.*",
          "*.*.*",
          "*.*.*.*",
          "company.*",
          "company.logo",
          "company.page_on_platform",
          "company.status",
          "company.category.master_id.*",
          "company.category.master_id.logo",
          "company.options.career_event_option_id.events.career_event_option_id.sub_options.career_sub_option_id.*",
        ] as any,
        limit,
        page,
        sort: sort as any,
        filter: {
          Floorplan: {
            _eq: floorplan.id as any, // only booths for this floorplan
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
    const client = await getServerDirectusClient()
    if (!client) return null

    const { search, limit = 300, page = 1, sort = "name" } = opts ?? {}
    return client.request(
      readItems("master", {
        fields: ["*"],
        limit,
        page,
        sort: sort as any,
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