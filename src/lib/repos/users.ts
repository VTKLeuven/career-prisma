// lib/repos/users.ts
"use server"

import { readItems, readItem, createItem, updateItem, DirectusUser } from "@directus/sdk";
import { getDirectusWithToken } from "@/lib/directus";
import { sendEmail } from "@/lib/repos/directus";
import { cookies } from "next/headers";
import { CompanyRep } from "@/lib/schema";

const USER_FIELDS = [
  "id",
  "first_name",
  "last_name",
  "email",
  "avatar",
  "title",
  "description"
] as const;

// --- Invite new rep (sends invitation email) ---
export async function createRep(payload: Partial<CompanyRep>) {
  const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? 'directus'}_access`;
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) throw new Error("No token available");
  if (!payload) throw new Error("No payload available");

  const email = payload.email;
  const role = payload.role;

  try {
    const res = await fetch(`${process.env.DIRECTUS_URL}users/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ email, role }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      console.error("Failed to invite user:", error);
      return null;
    }

    // Some Directus versions return 204 No Content
    if (res.status === 204) {
      // Fetch the user we just created, by email
      const lookup = await fetch(`${process.env.DIRECTUS_URL}users?filter[email][_eq]=${email}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const json = await lookup.json();
      return json.data?.[0] ?? null;
    }

    const json = await res.json();
    return json.data ?? null;
  } catch (err: any) {
    console.error("Failed to invite user:", err.message);
    return null;
  }
}

// --- Update rep (names or any other fields) ---
export async function updateRep(userId: string, updates: Partial<CompanyRep>) {
  const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? 'directus'}_access`;
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) throw new Error("No token available");

  try {
    const res = await fetch(`${process.env.DIRECTUS_URL}users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error("Failed to update user:", error);
      return null;
    }

    const json = await res.json();
    return json.data; // the updated user
  } catch (err: any) {
    console.error("Failed to update user:", err.message);
    return null;
  }
}

export async function waitForApproval(salespersonId: string, repPayload: Partial<CompanyRep>) {
  const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? 'directus'}_access`;
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) throw new Error("No token available");

  // 1️⃣ Create an approval entry in Directus
  const requestRes = await fetch(`${process.env.DIRECTUS_URL}items/company_user_requests`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: repPayload?.email,
      role: repPayload?.role,
      company: repPayload?.company?.id ?? null,
      salesperson: salespersonId,
      status: "pending",
    }),
  });

  if (!requestRes.ok) {
    const text = await requestRes.text();
    throw new Error(`Failed to create rep request: ${text}`);
  }

  const resJson = await requestRes.json().catch(() => null);
  const request = resJson?.data;

  if (!request) {
    throw new Error("Rep request creation returned empty data");
  }

  // 2️⃣ Email salesperson
  const salesperson = await fetchSalespersonByID(salespersonId);
  const approvalUrl = `${process.env.DIRECTUS_URL}/api/approve-rep?requestId=${request.id}&action=approve`;
  const rejectUrl = `${process.env.DIRECTUS_URL}/api/approve-rep?requestId=${request.id}&action=reject`;
  console.log("Salesperson object:", salesperson);

  try {
    await sendEmail({
      to: salesperson?.email ?? "matthijs.dehaeck@vtk.be",
      subject: `Approval needed for new Rep: ${repPayload?.email}`,
      html: `
        <p>A new Rep request for <b>${repPayload?.email}</b> is pending.</p>
        <p>
          <a href="${approvalUrl}">✅ Approve</a> |
          <a href="${rejectUrl}">❌ Reject</a>
        </p>
      `,
    });
  } catch (err) {
    console.error("Failed to send approval email:", err);
  }

  // 3️⃣ Poll until approved (or timeout)
  // (in production, you’d want to make this event-driven instead)
  let status = "pending";
  let elapsed = 0;

  while (status === "pending" && elapsed < 600000) {
    const poll = await fetch(`${process.env.DIRECTUS_URL}items/company_user_requests/${request.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const resJson = await poll.json().catch(() => ({}));
    const item = resJson?.data;
    console.log("Rep request creation response:", resJson);

    if (!item) {
      console.warn("Polling: request item not found, retrying...");
      await new Promise(r => setTimeout(r, 5000));
      elapsed += 5000;
      continue;
    }

    status = item.status ?? "pending";

    if (status !== "pending") break;

    await new Promise(r => setTimeout(r, 5000));
    elapsed += 5000;
  }

  return status === "approved";
}

export async function listSalespersons(opts?: {
  search?: string;
  limit?: number;
  page?: number;        // 1-based
  sort?: string;        // e.g. "-date_created" or "first_name"
}) {
  const { search, limit = 25, page = 1, sort = "first_name" } = opts ?? {};

  try {
    const params = new URLSearchParams({
      fields: USER_FIELDS.join(","),     // list of fields you want
      limit: String(limit),
      page: String(page),
      sort,
      filter: JSON.stringify({
        role: { _eq: "7b128ef4-f530-47d2-8f4c-ef82518eb313" }, // sales role UUID
      }),
    });

    if (search) {
      params.set("search", search);
    }

    // Public (no auth header)
    const res = await fetch(`${process.env.DIRECTUS_URL}users?${params}`, {
      // No Authorization header — public access
      next: { revalidate: 60 }, // optional caching (Next.js)
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      console.error("Failed to fetch public salespersons:", error);
      return [];
    }

    const json = await res.json();
    return json.data as DirectusUser[];
  } catch (err: any) {
    console.error("Failed to fetch public salespersons:", err.message);
    return [];
  }
}

export async function fetchSalespersonByID(salesperson_id: string, opts?: {
  search?: string;
  limit?: number;
  page?: number;        // 1-based
  sort?: string;        // e.g. "-date_created" or "first_name"
}) {
  const { search, limit = 25, page = 1, sort = "first_name" } = opts ?? {};

  try {
    const params = new URLSearchParams({
      fields: USER_FIELDS.join(","),     // list of fields you want
      limit: String(limit),
      page: String(page),
      sort,
      filter: JSON.stringify({
        role: { _eq: "7b128ef4-f530-47d2-8f4c-ef82518eb313" }, // sales role UUID
        id: { _eq: salesperson_id },
      }),
    });

    if (search) {
      params.set("search", search);
    }

    // Public (no auth header)
    const res = await fetch(`${process.env.DIRECTUS_URL}users?${params}`, {
      // No Authorization header — public access
      next: { revalidate: 60 }, // optional caching (Next.js)
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      console.error("Failed to fetch public salesperson:", error);
      return null;
    }

    const json = await res.json();
    return json.data[0] as DirectusUser;
  } catch (err: any) {
    console.error("Failed to fetch public salesperson:", err.message);
    return null;
  }
}
