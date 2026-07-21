"use server";

import { createHash, randomBytes } from "crypto";
import type { CompanyRep } from "@/lib/schema";
import prisma from "@/lib/prisma";
import { getUserFromCookies } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email";

const SALESPERSON_ROLE_ID = "7b128ef4-f530-47d2-8f4c-ef82518eb313";
const COMPANY_REP_ROLE_ID = "d5475bf4-a77f-48de-b06c-fac199b0f631";

async function requireUser() {
  const user = await getUserFromCookies();
  if (!user) throw new Error("Unauthorized");
  return user;
}

function roleId(role: CompanyRep["role"]): string | null {
  if (typeof role === "string") return role;
  return role?.id || null;
}

export async function createRep(payload: Partial<CompanyRep>) {
  await requireUser();
  if (!payload.email) throw new Error("Email is required");

  const email = payload.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("A user with this email already exists");
  }

  return prisma.user.create({
    data: {
      email,
      role_id: roleId(payload.role) || COMPANY_REP_ROLE_ID,
      status: "invited",
      first_name: payload.first_name || null,
      last_name: payload.last_name || null,
      title: payload.title || null,
      tel: payload.tel || null,
      company_id: payload.company?.id || null,
    },
  });
}

/** Minimal user list for relation dropdowns (e.g. picking a speaker's representative). */
export async function listUsersBasic(): Promise<
  { id: string; first_name: string | null; last_name: string | null; email: string | null }[]
> {
  await requireUser();
  return prisma.user.findMany({
    where: { status: { not: "archived" } },
    select: { id: true, first_name: true, last_name: true, email: true },
    orderBy: [{ first_name: "asc" }, { last_name: "asc" }],
  });
}

export type AdminUserRow = {
  id: string;
  avatar: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
  tel: string | null;
  status: string;
  role_id: string | null;
  role_name: string | null;
  company_id: string | null;
  company_name: string | null;
};

/** Full platform-user list for the admin users table. */
export async function listUsers(): Promise<AdminUserRow[]> {
  await requireUser();
  const rows = await prisma.user.findMany({
    include: {
      role: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { first_name: "asc" }],
  });
  return rows.map((u) => ({
    id: u.id,
    avatar: u.avatar,
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email,
    title: u.title,
    tel: u.tel,
    status: u.status,
    role_id: u.role_id,
    role_name: u.role?.name ?? null,
    company_id: u.company_id,
    company_name: u.company?.name ?? null,
  }));
}

/** Roles for the user-form dropdown. */
export async function listRoles(): Promise<{ id: string; name: string }[]> {
  await requireUser();
  return prisma.role.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

function toUserWrite(payload: Record<string, any>): Record<string, unknown> {
  const { id: _id, role, role_id, company, company_id, email, avatar, ...rest } = payload;
  const roleRef = role_id ?? role;
  const companyRef = company_id ?? (company && typeof company === "object" ? company.id : company);
  return {
    ...rest,
    ...(email !== undefined ? { email: email ? String(email).trim().toLowerCase() : null } : {}),
    ...(avatar !== undefined ? { avatar: avatar || null } : {}),
    ...(roleRef !== undefined ? { role_id: roleRef || null } : {}),
    ...(companyRef !== undefined ? { company_id: companyRef || null } : {}),
  };
}

/** Creates a platform user (admin flow). Defaults new accounts to `invited`. */
export async function createUser(payload: Record<string, any>): Promise<AdminUserRow> {
  await requireUser();
  const email = payload.email ? String(payload.email).trim().toLowerCase() : null;
  if (!email) throw new Error("Email is required");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("A user with this email already exists");

  const created = await prisma.user.create({
    data: {
      ...toUserWrite({ ...payload, email }),
      status: payload.status || "invited",
    },
  });
  return (await listUsersRow(created.id)) as AdminUserRow;
}

export async function updateUser(id: string, payload: Record<string, any>): Promise<AdminUserRow> {
  await requireUser();
  await prisma.user.update({ where: { id }, data: toUserWrite(payload) });
  return (await listUsersRow(id)) as AdminUserRow;
}

async function listUsersRow(id: string): Promise<AdminUserRow | null> {
  const u = await prisma.user.findUnique({
    where: { id },
    include: {
      role: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
    },
  });
  if (!u) return null;
  return {
    id: u.id,
    avatar: u.avatar,
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email,
    title: u.title,
    tel: u.tel,
    status: u.status,
    role_id: u.role_id,
    role_name: u.role?.name ?? null,
    company_id: u.company_id,
    company_name: u.company?.name ?? null,
  };
}

export async function generateInviteToken(
  userId: string
): Promise<{ token: string; email: string } | null> {
  await requireUser();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email) return null;

  const randomToken = randomBytes(32).toString("base64url");
  await prisma.user.update({
    where: { id: userId },
    data: {
      invite_token_hash: createHash("sha256")
        .update(randomToken)
        .digest("hex"),
      invite_token_created: new Date(),
      status: "invited",
    },
  });
  return {
    token: Buffer.from(`${userId}:${randomToken}`).toString("base64url"),
    email: user.email,
  };
}

export async function updateRep(
  userId: string,
  updates: Partial<CompanyRep>
) {
  await requireUser();
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...(updates.first_name !== undefined && { first_name: updates.first_name }),
        ...(updates.last_name !== undefined && { last_name: updates.last_name }),
        ...(updates.email !== undefined && { email: updates.email.trim().toLowerCase() }),
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.tel !== undefined && { tel: updates.tel }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.role !== undefined && { role_id: roleId(updates.role) }),
        ...(updates.company !== undefined && {
          company_id: updates.company?.id || null,
        }),
      },
    });
  } catch (error) {
    console.error("[updateRep] Failed:", error);
    return null;
  }
}

/** Archive instead of deleting, matching the old deleting_company_user flow. */
export async function deleteUser(
  userId: string,
  reassignToUserId?: string | null
): Promise<{ success: boolean; error?: string }> {
  await requireUser();
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: true };

    await prisma.$transaction([
      prisma.file.updateMany({
        where: { uploaded_by: userId },
        data: { uploaded_by: reassignToUserId ?? null },
      }),
      prisma.file.updateMany({
        where: { modified_by: userId },
        data: { modified_by: reassignToUserId ?? null },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          status: "archived",
          company_id: null,
          email: user.email
            ? `${user.email}+archived-${Date.now()}`
            : user.email,
        },
      }),
    ]);
    return { success: true };
  } catch (error) {
    console.error("[deleteUser] Failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function waitForApproval(
  _salespersonId: string,
  repPayload: Partial<CompanyRep>
) {
  await requireUser();
  if (!repPayload.email) throw new Error("Email is required");

  const request = await prisma.companyUserRequest.create({
    data: {
      status: "pending",
      email: repPayload.email.trim().toLowerCase(),
      company_id: repPayload.company?.id || null,
      first_name: repPayload.first_name || null,
      last_name: repPayload.last_name || null,
      tel: repPayload.tel || null,
      title: repPayload.title || null,
    },
    include: { company: { include: { salesperson: true } } },
  });

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_FORM_DOMAIN ||
    "http://localhost:3000";
  const approve = `${appUrl}/api/approve-rep?requestId=${request.id}&action=approve`;
  const reject = `${appUrl}/api/approve-rep?requestId=${request.id}&action=reject`;
  await sendEmail({
    to: request.company?.salesperson?.email || "matthijs.dehaeck@vtk.be",
    subject: `Approval needed for new representative: ${repPayload.email}`,
    html: `<p>A new representative requested access for ${request.company?.name || "a company"}.</p><p><a href="${approve}">Approve</a> · <a href="${reject}">Reject</a></p>`,
  });
  return false;
}

export async function listSalespersons(opts?: {
  search?: string;
  limit?: number;
  page?: number;
  sort?: string;
}): Promise<any[]> {
  const { search, limit = 25, page = 1, sort = "first_name" } = opts ?? {};
  const direction = sort.startsWith("-") ? ("desc" as const) : ("asc" as const);
  const orderBy =
    sort.replace(/^-/, "") === "last_name"
      ? { last_name: direction }
      : { first_name: direction };

  return prisma.user.findMany({
    where: {
      role_id: SALESPERSON_ROLE_ID,
      status: "active",
      ...(search && {
        OR: [
          { first_name: { contains: search, mode: "insensitive" as const } },
          { last_name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      avatar: true,
      title: true,
    },
    take: limit,
    skip: Math.max(0, page - 1) * limit,
    orderBy,
  });
}

export async function fetchSalespersonByID(salespersonId: string) {
  return prisma.user.findFirst({
    where: {
      id: salespersonId,
      role_id: SALESPERSON_ROLE_ID,
      status: "active",
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      avatar: true,
      title: true,
    },
  });
}

export type PendingApprovalRequest = {
  id: string;
  email: string;
  role?: string;
  status: string;
  date_created?: string;
  company: {
    id: string;
    name: string;
    VAT: string | null;
    address_street: string | null;
    address_number: string | null;
    address_zip: string | null;
    address_city: string | null;
    address_country: string | null;
  } | null;
  first_name?: string | null;
  last_name?: string | null;
  tel?: string | null;
  title?: string | null;
};

export async function fetchPendingApprovalRequests(
  salespersonId: string
): Promise<PendingApprovalRequest[]> {
  const user = await requireUser();
  if (!user.admin && user.id !== salespersonId) return [];

  const requests = await prisma.companyUserRequest.findMany({
    where: {
      status: "pending",
      ...(!user.admin && {
        company: { is: { salesperson_id: salespersonId } },
      }),
    },
    include: { company: true },
    orderBy: { id: "desc" },
  });

  return requests.map((request) => ({
    id: String(request.id),
    email: request.email || "",
    role: COMPANY_REP_ROLE_ID,
    status: request.status,
    company: request.company
      ? {
          id: request.company.id,
          name: request.company.name || "",
          VAT: request.company.VAT,
          address_street: request.company.address_street,
          address_number: request.company.address_number,
          address_zip: request.company.address_zip,
          address_city: request.company.address_city,
          address_country: request.company.address_country,
        }
      : null,
    first_name: request.first_name,
    last_name: request.last_name,
    tel: request.tel,
    title: request.title,
  }));
}
