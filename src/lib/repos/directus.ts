// lib/repos/directus.ts
"use server";

import { cookies } from "next/headers";
import nodemailer from "nodemailer";
import { getFormUploadsFolderId } from "@/lib/directus";

export async function uploadDirectusFile(file: File): Promise<string | null> {
  const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) {
    console.error("No Directus access token found");
    return null;
  }

  // Get Form_uploads folder ID
  const folderId = await getFormUploadsFolderId();

  const formData = new FormData();
  formData.append("file", file);
  // Add folder parameter if folder ID is available
  if (folderId) {
    formData.append("folder", folderId);
  }

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Directus file upload failed:", data);
      return null;
    }

    const fileId = data?.data?.id ?? null;
    if (!fileId) {
      return null;
    }

    // Update the file to set the folder if needed (fallback in case folder parameter wasn't processed during upload)
    const uploadedFolderId = data?.data?.folder || data?.folder;
    if (folderId && token && uploadedFolderId !== folderId) {
      try {
        const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL;
        if (directusUrl) {
          const updateUrl = `${directusUrl.replace(/\/$/, '')}/files/${fileId}`;
          const updateRes = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ folder: folderId }),
          });

          if (!updateRes.ok) {
            const updateError = await updateRes.json().catch(() => ({ message: 'Update failed' }));
            console.warn("Failed to update file folder:", updateError);
          }
        }
      } catch (updateErr) {
        console.warn("Error updating file folder:", updateErr);
        // Don't fail the upload if folder update fails
      }
    }

    return fileId;
  } catch (err) {
    console.error("Error uploading file to Directus:", err);
    return null;
  }
}

// Singleton transporter with connection pooling to avoid rate limiting
let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  // Check if SMTP credentials are provided for Google SMTP
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  
  // If credentials are provided, use Google SMTP (smtp.gmail.com)
  // Otherwise, use the configured SMTP_HOST or default to smtp-relay.gmail.com
  const smtpHost = process.env.SMTP_HOST || (smtpUser && smtpPass ? "smtp.gmail.com" : "smtp-relay.gmail.com");
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);

  // Build transporter config with connection pooling
  interface SMTPTransportOptions {
    host: string;
    port: number;
    secure: boolean;
    requireTLS: boolean;
    tls: {
      rejectUnauthorized: boolean;
      minVersion: string;
    };
    logger?: boolean;
    debug?: boolean;
    pool?: boolean;
    maxConnections?: number;
    maxMessages?: number;
    rateDelta?: number;
    rateLimit?: number;
    auth?: {
      user: string;
      pass: string;
    };
  }

  const transportConfig: SMTPTransportOptions = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    requireTLS: smtpPort === 587, // Only require TLS for port 587
    tls: {
      // Do not fail on invalid certs for development
      rejectUnauthorized: false,
      minVersion: "TLSv1.2",
    },
    // Connection pooling to reuse connections and reduce EHLO commands
    pool: true,
    maxConnections: 3, // Reduced from 5 to be less aggressive
    maxMessages: 50, // Reduced from 100 to close connections more frequently
    rateDelta: 1000, // Time window for rate limiting (1 second)
    rateLimit: 3, // Reduced from 5 to be more conservative
    // Optional: Enable connection logging for debugging
    logger: process.env.NODE_ENV === "development",
    debug: process.env.NODE_ENV === "development",
  };

  // Add authentication if credentials are provided
  if (smtpUser && smtpPass) {
    transportConfig.auth = {
      user: smtpUser,
      pass: smtpPass,
    };
  }

  cachedTransporter = nodemailer.createTransport(transportConfig as nodemailer.TransportOptions);
  return cachedTransporter;
}

// Reset transporter to clear bad connections (e.g., after rate limit errors)
function resetTransporter() {
  if (cachedTransporter) {
    cachedTransporter.close();
    cachedTransporter = null;
  }
}

// Check if error is a rate limit error
function isRateLimitError(error: Error & { code?: string; responseCode?: number; response?: string }): boolean {
  const errorCode = error.code;
  const responseCode = error.responseCode;
  const response = error.response?.toLowerCase() || '';
  
  // Check for 421 rate limit errors (Google SMTP)
  if (responseCode === 421) {
    return true;
  }
  
  // Check for ECONNECTION with rate limit message
  if (errorCode === 'ECONNECTION' && (
    response.includes('rate limit') ||
    response.includes('try again later') ||
    response.includes('421')
  )) {
    return true;
  }
  
  return false;
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  // Determine the from email priority:
  // 1. Explicit 'from' parameter
  // 2. SMTP_FROM_EMAIL env variable
  // 3. SMTP_USER (username from credentials) if credentials are provided
  // 4. Fallback to noreply@example.com
  const smtpUser = process.env.SMTP_USER;
  const defaultFromEmail = process.env.SMTP_FROM_EMAIL;
  const fromEmail = from || defaultFromEmail || smtpUser || "noreply@example.com";

  // Retry logic for rate-limited connections
  // Google SMTP rate limits can require 60+ seconds to recover
  const maxRetries = 4;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get a fresh transporter (will reuse cached one if available)
      const transporter = getTransporter();
      
      await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        html,
      });
      return; // Success, exit function
    } catch (error) {
      const err = error as Error & { code?: string; responseCode?: number; response?: string; command?: string };
      lastError = err;

      // Check if this is a rate limit error
      if (isRateLimitError(err) && attempt < maxRetries) {
        // Reset transporter to clear bad connections
        resetTransporter();
        
        // Exponential backoff with jitter: 30s, 60s, 120s
        // Add jitter (±20%) to prevent synchronized retries
        const baseWaitTime = Math.min(30 * Math.pow(2, attempt - 1) * 1000, 120000); // Cap at 120s
        const jitter = baseWaitTime * 0.2 * (Math.random() * 2 - 1); // ±20% jitter
        const waitTime = Math.floor(baseWaitTime + jitter);
        
        console.warn(
          `Email send attempt ${attempt}/${maxRetries} failed with rate limit (${err.responseCode || err.code}). ` +
          `Retrying in ${Math.round(waitTime / 1000)}s...`
        );
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // For other errors or final attempt, throw immediately
      console.error("Failed to send email:", error);
      throw error;
    }
  }

  // If we exhausted all retries, throw the last error
  if (lastError) {
    throw lastError;
  }
}
