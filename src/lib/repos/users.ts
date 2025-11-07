// lib/repos/users.ts
"use server"

import { DirectusUser } from "@directus/sdk";
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
  } catch (err) {
    console.error("Failed to invite user:", err instanceof Error ? err.message : "Unknown error");
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
  } catch (err) {
    console.error("Failed to update user:", err instanceof Error ? err.message : "Unknown error");
    return null;
  }
}

// --- Reassign files uploaded by a user to another user (or null) ---
async function reassignUserFiles(userId: string, newUserId: string | null, token: string): Promise<boolean> {
  try {
    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) throw new Error("DIRECTUS_URL not configured");

    // Normalize base URL (ensure exactly one trailing slash)
    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Fetch all files uploaded by this user
    let allFiles: Array<{ id: string }> = [];
    let page = 1;
    const limit = 100;

    // Fetch all files in batches
    while (true) {
      const filesRes = await fetch(
        `${normalizedBase}files?filter[uploaded_by][_eq]=${userId}&limit=${limit}&page=${page}&fields=id`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (!filesRes.ok) {
        const error = await filesRes.json().catch(() => null);
        console.error("Failed to fetch files:", error);
        return false;
      }

      const filesData = await filesRes.json();
      const files = filesData?.data || [];

      if (files.length === 0) {
        break; // No more files
      }

      allFiles = allFiles.concat(files);
      
      // If we got fewer files than the limit, we've reached the end
      if (files.length < limit) {
        break;
      }

      page++;
    }

    // If no files found, that's okay - nothing to reassign
    if (allFiles.length === 0) {
      console.log("No files to reassign for user", userId);
      return true;
    }

    console.log(`Found ${allFiles.length} file(s) to reassign for user ${userId}`);

    // Try bulk update first using items endpoint format
    // For Directus, bulk updates with filters might work differently
    // Try using the items endpoint format: PATCH /items/{collection}?filter=...
    try {
      const bulkUpdateRes = await fetch(
        `${normalizedBase}items/directus_files?filter[uploaded_by][_eq]=${userId}`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uploaded_by: newUserId,
          }),
        }
      );

      if (bulkUpdateRes.ok) {
        console.log(`Successfully bulk reassigned files from user ${userId} to ${newUserId || 'null'}`);
        return true;
      }
      
      // If bulk update failed, fall back to individual updates
      console.log("Bulk update failed, falling back to individual updates");
    } catch (bulkError) {
      console.log("Bulk update error, falling back to individual updates:", bulkError);
    }

    // Fallback: Update each file individually
    const updatePromises = allFiles.map((file) =>
      fetch(`${normalizedBase}files/${file.id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uploaded_by: newUserId,
        }),
      })
    );

    const results = await Promise.allSettled(updatePromises);

    // Check if all updates succeeded
    const failures = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
    
    if (failures.length > 0) {
      console.error(`Failed to reassign ${failures.length} file(s)`);
      // Try to get error details from the first failure
      if (failures[0].status === "fulfilled" && failures[0].value) {
        const error = await failures[0].value.json().catch(() => null);
        console.error("First failure error:", error);
      }
      return false;
    }

    console.log(`Successfully reassigned ${allFiles.length} file(s) from user ${userId} to ${newUserId || 'null'}`);
    return true;
  } catch (err) {
    console.error("Error reassigning files:", err);
    return false;
  }
}

// --- Get current user ID (for reassigning files) ---
async function getCurrentUserId(token: string): Promise<string | null> {
  try {
    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) return null;

    // Normalize base URL (ensure exactly one trailing slash)
    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    const res = await fetch(`${normalizedBase}users/me?fields=id`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.data?.id || null;
  } catch (err) {
    console.error("Error getting current user ID:", err);
    return null;
  }
}

// --- Delete user from Directus ---
// Returns: { success: boolean, error?: string }
// If reassignToUserId is provided, files will be reassigned to that user before deletion
export async function deleteUser(
  userId: string,
  reassignToUserId?: string | null
): Promise<{ success: boolean; error?: string }> {
  const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? 'directus'}_access`;
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) throw new Error("No token available");

  const baseUrl = process.env.DIRECTUS_URL;
  if (!baseUrl) throw new Error("DIRECTUS_URL not configured");

  // Normalize base URL (ensure exactly one trailing slash)
  const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

  try {
    // First, try to delete the user
    let res = await fetch(`${normalizedBase}users/${userId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    // If deletion fails due to foreign key constraint, reassign files and try again
    if (!res.ok) {
      const error = await res.json().catch(() => null);
      const errorMessage = error?.errors?.[0]?.message || error?.message || "Unknown error";
      
      // Check if it's a foreign key constraint error
      if (errorMessage.includes("foreign key constraint") || errorMessage.includes("violates foreign key")) {
        console.log("Foreign key constraint detected, attempting to reassign files...");
        
        // Determine which user to reassign files to
        let targetUserId: string | null = null;
        
        if (reassignToUserId !== undefined) {
          // Use provided user ID (could be null to unassign)
          targetUserId = reassignToUserId;
        } else {
          // Try to get the current user (admin performing the deletion)
          targetUserId = await getCurrentUserId(token);
        }
        
        // Reassign files (to target user or null if no target)
        const reassigned = await reassignUserFiles(userId, targetUserId, token);
        
        if (!reassigned) {
          // If reassignment failed, try setting to null as fallback
          await reassignUserFiles(userId, null, token);
        }
        
        // Now try to delete again
        res = await fetch(`${normalizedBase}users/${userId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        
        if (!res.ok) {
          const retryError = await res.json().catch(() => null);
          const retryErrorMessage = retryError?.errors?.[0]?.message || retryError?.message || "Unknown error";
          console.error("Failed to delete user after reassignment:", retryErrorMessage);
          
          // Check if it's still a constraint error (might be other tables)
          if (retryErrorMessage.includes("foreign key constraint") || retryErrorMessage.includes("violates foreign key")) {
            return { success: false, error: "CONSTRAINT_ERROR" };
          }
          
          return { success: false, error: retryErrorMessage };
        }
      } else {
        // Other error, return it
        console.error("Failed to delete user:", errorMessage);
        return { success: false, error: errorMessage };
      }
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to delete user:", errorMessage);
    return { success: false, error: errorMessage };
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
  } catch (err) {
    console.error("Failed to fetch public salespersons:", err instanceof Error ? err.message : "Unknown error");
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
  } catch (err) {
    console.error("Failed to fetch public salesperson:", err instanceof Error ? err.message : "Unknown error");
    return null;
  }
}
