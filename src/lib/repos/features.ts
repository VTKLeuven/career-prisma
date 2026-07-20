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

/* ------------------------------------------------------------------ *
 * Master (study programme) writes
 * ------------------------------------------------------------------ */

/** Maps the legacy write shape (`logo` id, string ids) to Prisma columns. */
function toMasterWrite(payload: Record<string, any>): Record<string, unknown> {
  const { logo, id: _id, ...rest } = payload
  return {
    ...rest,
    ...(payload.students !== undefined
      ? { students: payload.students == null ? null : Number(payload.students) }
      : {}),
    ...(logo !== undefined ? { logo_id: logo || null } : {}),
  }
}

export async function createMaster(payload: Record<string, any>): Promise<Master> {
  const row = await prisma.master.create({ data: toMasterWrite(payload) })
  return shapeMaster(row) as Master
}

export async function updateMaster(
  id: number,
  payload: Record<string, any>
): Promise<Master> {
  const row = await prisma.master.update({
    where: { id },
    data: toMasterWrite(payload),
  })
  return shapeMaster(row) as Master
}

export async function deleteMaster(id: number): Promise<void> {
  await prisma.master.delete({ where: { id } })
}

/* ------------------------------------------------------------------ *
 * Faculty writes (+ faculty_master junction)
 * ------------------------------------------------------------------ */

function toFacultyWrite(payload: Record<string, any>): Record<string, unknown> {
  const { logo, id: _id, masters: _masters, masterIds: _masterIds, ...rest } = payload
  return {
    ...rest,
    ...(logo !== undefined ? { logo_id: logo || null } : {}),
  }
}

/** Replaces a faculty's master associations with exactly `masterIds`. */
export async function setFacultyMasters(
  facultyId: number,
  masterIds: number[]
): Promise<void> {
  const ids = [...new Set(masterIds.map(Number).filter(Number.isFinite))]
  await prisma.$transaction([
    prisma.facultyMaster.deleteMany({ where: { faculty_id: facultyId } }),
    ...(ids.length
      ? [
          prisma.facultyMaster.createMany({
            data: ids.map((master_id) => ({ faculty_id: facultyId, master_id })),
          }),
        ]
      : []),
  ])
}

export async function createFaculty(payload: Record<string, any>): Promise<Faculty> {
  const row = await prisma.faculty.create({
    data: { ...toFacultyWrite(payload), date_created: new Date() },
  })
  const masterIds = Array.isArray(payload.masterIds) ? payload.masterIds : []
  if (masterIds.length) await setFacultyMasters(row.id, masterIds.map(Number))
  return getFacultyById(row.id) as Promise<Faculty>
}

export async function updateFaculty(
  id: number,
  payload: Record<string, any>
): Promise<Faculty> {
  await prisma.faculty.update({
    where: { id },
    data: { ...toFacultyWrite(payload), date_updated: new Date() },
  })
  if (Array.isArray(payload.masterIds)) {
    await setFacultyMasters(id, payload.masterIds.map(Number))
  }
  return getFacultyById(id) as Promise<Faculty>
}

export async function deleteFaculty(id: number): Promise<void> {
  await prisma.$transaction([
    prisma.facultyMaster.deleteMany({ where: { faculty_id: id } }),
    prisma.faculty.delete({ where: { id } }),
  ])
}

async function getFacultyById(id: number): Promise<Faculty | null> {
  const row = await prisma.faculty.findUnique({
    where: { id },
    include: FACULTY_INCLUDE,
  })
  return shapeFaculty(row) as Faculty | null
}
