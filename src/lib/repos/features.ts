// lib/repos/features.ts
import { getServerDirectusClient } from "@/lib/directus"
import type { Floorplan, Booth, Master, Faculty } from "@/lib/schema"
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

export async function listFaculties(
  opts?: {
    limit?: number
    sort?: string
  }
): Promise<Faculty[] | null> {
  try {
    const client = await getServerDirectusClient()
    if (!client) return null

    const { limit = 300, sort = "name" } = opts ?? {}
    // Try common Directus M2M patterns: faculty.masters or faculty.faculty_master
    const fieldSets = [
      ["id", "name", "masters.master_id.id", "masters.master_id.name"],
      ["id", "name", "faculty_master.master_id.id", "faculty_master.master_id.name"],
      ["id", "name", "faculty_masters.master_id.id", "faculty_masters.master_id.name"],
      ["id", "name", "masters.id", "masters.name"],
      ["id", "name", "master.id", "master.name"],
    ]
    const collections = ["faculty", "Faculty"]
    for (const coll of collections) {
      for (const fields of fieldSets) {
        try {
          const result = await client.request(
            readItems(coll as any, {
              fields: fields as any,
              limit,
              sort: sort as any,
            })
          )
          if (Array.isArray(result) && result.length >= 0) {
            return result as unknown as Faculty[]
          }
        } catch {
          continue
        }
      }
    }
    return null
  } catch (error) {
    console.error("Failed to fetch faculties:", error)
    return null
  }
}