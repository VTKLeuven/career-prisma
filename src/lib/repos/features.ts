// lib/repos/features.ts
import { prisma } from "@/lib/prisma"
import {
  COMPANY_INCLUDE,
  FACULTY_INCLUDE,
  shapeBooth,
  shapeFaculty,
  shapeMaster,
} from "@/lib/repos/_shape"
import type { Floorplan, Booth, Master, Faculty } from "@/lib/schema"

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

    const { search, limit = -1, page = 1, sort = "booth_number" } = opts ?? {}
    const desc = sort.startsWith("-")
    const sortField = desc ? sort.slice(1) : sort

    const rows = await prisma.booth.findMany({
      where: {
        floorplan_id: Number(floorplan.id),
        ...(search
          ? { company: { name: { contains: search, mode: "insensitive" } } }
          : {}),
      },
      include: {
        floorplan: true,
        company: { include: COMPANY_INCLUDE },
      },
      orderBy: { [sortField]: desc ? "desc" : "asc" },
      // Directus used limit: -1 to mean "no limit"; Prisma expresses that by
      // omitting `take` entirely.
      ...(limit > 0 ? { take: limit, skip: (page - 1) * limit } : {}),
    })

    return rows.map(shapeBooth) as Booth[]
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
    const { search, limit = 300, page = 1, sort = "name" } = opts ?? {}
    const desc = sort.startsWith("-")
    const sortField = desc ? sort.slice(1) : sort

    const rows = await prisma.master.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { short_name: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { [sortField]: desc ? "desc" : "asc" },
      take: limit,
      skip: (page - 1) * limit,
    })

    return rows.map(shapeMaster) as Master[]
  } catch (error) {
    console.error("Failed to fetch masters:", error)
    return null
  }
}

/**
 * The Directus version tried five different field spellings across two
 * collection names, because the m2m alias could not be relied on. The relation
 * is faculty -> faculty_master -> master, so one query answers it.
 */
export async function listFaculties(
  opts?: {
    limit?: number
    sort?: string
  }
): Promise<Faculty[] | null> {
  try {
    const { limit = 300, sort = "name" } = opts ?? {}
    const desc = sort.startsWith("-")
    const sortField = desc ? sort.slice(1) : sort

    const rows = await prisma.faculty.findMany({
      include: FACULTY_INCLUDE,
      orderBy: { [sortField]: desc ? "desc" : "asc" },
      take: limit,
    })

    return rows.map(shapeFaculty) as Faculty[]
  } catch (error) {
    console.error("Failed to fetch faculties:", error)
    return null
  }
}
