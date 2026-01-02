// lib/repos/students.ts
"use server"

import { cookies } from "next/headers";
import { Student } from "@/lib/schema";

const STUDENT_COLLECTION = "students";

/**
 * Find student by email
 */
export async function findStudentByEmail(email: string): Promise<Student | null> {
  try {
    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) {
      console.error("[findStudentByEmail] DIRECTUS_URL not configured");
      return null;
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Use server token if available for data access
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    const authToken = serverToken;

    if (!authToken) {
      console.error("[findStudentByEmail] DIRECTUS_SERVER_TOKEN not configured");
      return null;
    }

    const res = await fetch(
      `${normalizedBase}items/${STUDENT_COLLECTION}?filter[email][_eq]=${encodeURIComponent(email)}&limit=1`,
      {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error(`[findStudentByEmail] Failed to fetch student:`, res.status, errorData);
      return null;
    }

    const json = await res.json();
    const students = json.data || [];
    
    return students.length > 0 ? students[0] as Student : null;
  } catch (err) {
    console.error("[findStudentByEmail] Exception:", err);
    return null;
  }
}

/**
 * Find student by LITUS username
 */
export async function findStudentByUsername(username: string): Promise<Student | null> {
  try {
    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) {
      console.error("[findStudentByUsername] DIRECTUS_URL not configured");
      return null;
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Use server token if available for data access
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    const authToken = serverToken;

    if (!authToken) {
      console.error("[findStudentByUsername] DIRECTUS_SERVER_TOKEN not configured");
      return null;
    }

    const res = await fetch(
      `${normalizedBase}items/${STUDENT_COLLECTION}?filter[username][_eq]=${encodeURIComponent(username)}&limit=1`,
      {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error(`[findStudentByUsername] Failed to fetch student:`, res.status, errorData);
      return null;
    }

    const json = await res.json();
    const students = json.data || [];
    
    return students.length > 0 ? students[0] as Student : null;
  } catch (err) {
    console.error("[findStudentByUsername] Exception:", err);
    return null;
  }
}

/**
 * Create student from OAuth data
 */
export async function createStudentFromOAuth(
  oauthData: {
    username: string;
    full_name?: string;
    email: string;
    university_status?: string;
    university?: string;
    organization_status?: string;
    in_workinggroup?: boolean;
  },
  tokenData: {
    access_token: string;
    expires_in?: number;
  }
): Promise<Student | null> {
  try {
    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) {
      console.error("[createStudentFromOAuth] DIRECTUS_URL not configured");
      return null;
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Use server token for student creation
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    const authToken = serverToken;

    if (!authToken) {
      console.error("[createStudentFromOAuth] DIRECTUS_SERVER_TOKEN not configured");
      return null;
    }

    // Parse full_name into first_name and last_name
    const nameParts = oauthData.full_name?.trim().split(/\s+/) || [];
    const first_name = nameParts.length > 0 ? nameParts[0] : null;
    const last_name = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

    // Calculate token expiration
    const expiresIn = tokenData.expires_in || 3600; // Default 1 hour
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const studentData = {
      username: oauthData.username,
      email: oauthData.email,
      first_name,
      last_name,
      full_name: oauthData.full_name || null,
      university_status: oauthData.university_status || null,
      university: oauthData.university || "KU Leuven", // Default to KU Leuven for LITUS OAuth
      organization_status: oauthData.organization_status || null,
      in_workinggroup: oauthData.in_workinggroup ?? false,
      litus_access_token: tokenData.access_token,
      litus_token_expires_at: tokenExpiresAt,
    };

    const res = await fetch(`${normalizedBase}items/${STUDENT_COLLECTION}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify(studentData),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const errorMessage = errorData?.errors?.[0]?.message || await res.text().catch(() => "Unknown error");
      console.error(`[createStudentFromOAuth] Failed to create student:`, res.status, errorMessage);
      return null;
    }

    const json = await res.json();
    const student = json.data as Student;

    console.log(`[createStudentFromOAuth] Successfully created student ${student.id} for ${oauthData.email}`);
    return student;
  } catch (err) {
    console.error("[createStudentFromOAuth] Exception:", err);
    return null;
  }
}

/**
 * Update student OAuth token
 */
export async function updateStudentOAuthToken(
  studentId: string,
  tokenData: {
    access_token: string;
    expires_in?: number;
  }
): Promise<Student | null> {
  try {
    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) {
      console.error("[updateStudentOAuthToken] DIRECTUS_URL not configured");
      return null;
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Use server token for updates
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    const authToken = serverToken;

    if (!authToken) {
      console.error("[updateStudentOAuthToken] DIRECTUS_SERVER_TOKEN not configured");
      return null;
    }

    // Calculate token expiration
    const expiresIn = tokenData.expires_in || 3600; // Default 1 hour
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const res = await fetch(`${normalizedBase}items/${STUDENT_COLLECTION}/${studentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        litus_access_token: tokenData.access_token,
        litus_token_expires_at: tokenExpiresAt,
        date_updated: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error(`[updateStudentOAuthToken] Failed to update student:`, res.status, errorData);
      return null;
    }

    const json = await res.json();
    return json.data as Student;
  } catch (err) {
    console.error("[updateStudentOAuthToken] Exception:", err);
    return null;
  }
}

/**
 * Generate verification token for student
 */
export async function generateStudentVerificationToken(
  studentId: string
): Promise<{ token: string; email: string } | null> {
  try {
    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) {
      console.error("[generateStudentVerificationToken] DIRECTUS_URL not configured");
      return null;
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;

    if (!serverToken) {
      console.error("[generateStudentVerificationToken] DIRECTUS_SERVER_TOKEN not configured");
      return null;
    }

    // Fetch student to get email
    const studentRes = await fetch(
      `${normalizedBase}items/${STUDENT_COLLECTION}/${studentId}?fields=id,email`,
      {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      }
    );

    if (!studentRes.ok) {
      console.error(`[generateStudentVerificationToken] Failed to fetch student ${studentId}`);
      return null;
    }

    const studentData = await studentRes.json();
    const student = studentData.data;

    if (!student || !student.email) {
      console.error(`[generateStudentVerificationToken] Student ${studentId} not found or missing email`);
      return null;
    }

    // Generate secure random token
    const crypto = await import("crypto");
    const randomToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto
      .createHash("sha256")
      .update(randomToken)
      .digest("hex");

    // Create verification token: base64(studentId:randomToken)
    const verificationToken = Buffer.from(`${student.id}:${randomToken}`).toString("base64url");

    // Store token hash and creation time
    try {
      const updateRes = await fetch(
        `${normalizedBase}items/${STUDENT_COLLECTION}/${student.id}`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${serverToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            verification_token_hash: tokenHash,
            verification_token_created: new Date().toISOString(),
            verified: false,
          }),
        }
      );

      if (!updateRes.ok) {
        console.warn(`[generateStudentVerificationToken] Failed to store token hash`);
      }
    } catch (err) {
      console.warn(`[generateStudentVerificationToken] Exception storing token:`, err);
    }

    console.log(`[generateStudentVerificationToken] Successfully generated verification token for student ${studentId}`);
    return {
      token: verificationToken,
      email: student.email,
    };
  } catch (err) {
    console.error("[generateStudentVerificationToken] Exception:", err);
    return null;
  }
}

/**
 * Create student without OAuth (for manual registration)
 */
export async function createNonOAuthStudent(
  studentData: {
    username: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    email: string;
    university_status?: string | null;
    university?: string | null;
    in_workinggroup?: boolean;
  }
): Promise<Student | null> {
  try {
    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) {
      console.error("[createNonOAuthStudent] DIRECTUS_URL not configured");
      return null;
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Use server token for student creation
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    const authToken = serverToken;

    if (!authToken) {
      console.error("[createNonOAuthStudent] DIRECTUS_SERVER_TOKEN not configured");
      return null;
    }

    const payload = {
      username: studentData.username,
      email: studentData.email,
      first_name: studentData.first_name,
      last_name: studentData.last_name,
      full_name: studentData.full_name || `${studentData.first_name} ${studentData.last_name}`,
      university_status: studentData.university_status || null,
      university: studentData.university || null,
      in_workinggroup: studentData.in_workinggroup ?? false,
    };

    const res = await fetch(`${normalizedBase}items/${STUDENT_COLLECTION}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const errorMessage = errorData?.errors?.[0]?.message || await res.text().catch(() => "Unknown error");
      console.error(`[createNonOAuthStudent] Failed to create student:`, res.status, errorMessage);
      return null;
    }

    const json = await res.json();
    const student = json.data as Student;

    console.log(`[createNonOAuthStudent] Successfully created student ${student.id} for ${studentData.email}`);
    return student;
  } catch (err) {
    console.error("[createNonOAuthStudent] Exception:", err);
    return null;
  }
}

/**
 * Update student OAuth data (for refreshing user info)
 */
export async function updateStudentOAuthData(
  studentId: string,
  oauthData: {
    full_name?: string;
    email?: string;
    university_status?: string;
    university?: string;
    organization_status?: string;
    in_workinggroup?: boolean;
  }
): Promise<Student | null> {
  try {
    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) {
      console.error("[updateStudentOAuthData] DIRECTUS_URL not configured");
      return null;
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";

    // Use server token for updates
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    const authToken = serverToken;

    if (!authToken) {
      console.error("[updateStudentOAuthData] DIRECTUS_SERVER_TOKEN not configured");
      return null;
    }

    // Parse full_name into first_name and last_name if provided
    const updates: Record<string, unknown> = {
      date_updated: new Date().toISOString(),
    };

    if (oauthData.full_name) {
      const nameParts = oauthData.full_name.trim().split(/\s+/);
      updates.first_name = nameParts.length > 0 ? nameParts[0] : null;
      updates.last_name = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
      updates.full_name = oauthData.full_name;
    }

    if (oauthData.email) updates.email = oauthData.email;
    if (oauthData.university_status !== undefined) updates.university_status = oauthData.university_status;
    // Always set university to KU Leuven for OAuth students (or use provided value)
    if (oauthData.university !== undefined) {
      updates.university = oauthData.university;
    } else {
      // If not provided, default to KU Leuven for LITUS OAuth
      updates.university = "KU Leuven";
    }
    if (oauthData.organization_status !== undefined) updates.organization_status = oauthData.organization_status;
    if (oauthData.in_workinggroup !== undefined) updates.in_workinggroup = oauthData.in_workinggroup;

    const res = await fetch(`${normalizedBase}items/${STUDENT_COLLECTION}/${studentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error(`[updateStudentOAuthData] Failed to update student:`, res.status, errorData);
      return null;
    }

    const json = await res.json();
    return json.data as Student;
  } catch (err) {
    console.error("[updateStudentOAuthData] Exception:", err);
    return null;
  }
}

