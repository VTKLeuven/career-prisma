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
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const isDevelopment = process.env.NODE_ENV === "development";
  const explicitSmtpHost = process.env.SMTP_HOST?.trim();
  
  // Determine SMTP host with priority:
  // 1. If SMTP_USER and SMTP_PASS are provided, ALWAYS use Google SMTP (smtp.gmail.com)
  //    This overrides SMTP_HOST to ensure authentication works properly
  // 2. Otherwise, use SMTP_HOST if explicitly configured
  // 3. Finally, default to smtp-relay.gmail.com (requires relay server setup)
  let smtpHost: string;
  const hasCredentials = smtpUser && smtpPass;
  
  if (hasCredentials) {
    // Force Google SMTP when credentials are provided (required for authentication)
    smtpHost = "smtp.gmail.com";
    if (isDevelopment) {
      console.log("[SMTP] ✓ Using Google SMTP (smtp.gmail.com) with authentication");
      console.log("[SMTP] ✓ From email will be:", smtpUser);
      if (explicitSmtpHost && explicitSmtpHost !== "smtp.gmail.com") {
        console.warn(
          `[SMTP] ⚠ SMTP_HOST=${explicitSmtpHost} is set but ignored because SMTP_USER/SMTP_PASS are provided.\n` +
          `[SMTP] Using smtp.gmail.com instead for authenticated Google SMTP.`
        );
      }
    }
  } else if (explicitSmtpHost) {
    // Use explicitly configured host if no credentials
    smtpHost = explicitSmtpHost;
    if (isDevelopment) {
      console.log(`[SMTP] Using configured SMTP_HOST: ${smtpHost}`);
      console.warn(
        "[SMTP] ⚠ No SMTP_USER/SMTP_PASS provided. Authentication may fail.\n" +
        "For development with Gmail, set SMTP_USER and SMTP_PASS to use Google SMTP with authentication."
      );
    }
  } else {
    // Fallback to relay server (requires network configuration, no auth)
    smtpHost = "smtp-relay.gmail.com";
    if (isDevelopment) {
      console.warn(
        "[SMTP] ⚠ No SMTP_USER/SMTP_PASS provided. Using smtp-relay.gmail.com which requires relay server setup.\n" +
        "For development, set SMTP_USER and SMTP_PASS environment variables to use Google SMTP directly.\n" +
        "Note: For Gmail, you need to use an App Password (not your regular password) if 2FA is enabled.\n" +
        "      Generate one at: https://myaccount.google.com/apppasswords"
      );
    }
  }
  
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  
  // Log configuration in development
  if (isDevelopment) {
    console.log(`[SMTP] Configuration: host=${smtpHost}, port=${smtpPort}, hasAuth=${hasCredentials}`);
    if (hasCredentials) {
      console.log(`[SMTP] User: ${smtpUser}, Password: ${smtpPass ? "***" : "NOT SET"}`);
    }
  }

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
  if (hasCredentials) {
    transportConfig.auth = {
      user: smtpUser!,
      pass: smtpPass!,
    };
  } else if (smtpHost === "smtp.gmail.com") {
    // Warn if trying to use smtp.gmail.com without credentials
    if (isDevelopment) {
      console.error(
        "[SMTP] ERROR: smtp.gmail.com requires authentication but SMTP_USER/SMTP_PASS are not set!\n" +
        "Please set SMTP_USER and SMTP_PASS environment variables."
      );
    }
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
  // 1. Explicit 'from' parameter (highest priority)
  // 2. SMTP_FROM_EMAIL env variable
  // 3. SMTP_USER (Gmail account email) if using Google SMTP with credentials
  // 4. Fallback to noreply@example.com
  const smtpUser = process.env.SMTP_USER?.trim();
  const defaultFromEmail = process.env.SMTP_FROM_EMAIL?.trim();
  const fromEmail = from || defaultFromEmail || smtpUser || "noreply@example.com";
  
  // Log in development for debugging
  if (process.env.NODE_ENV === "development") {
    console.log(`[Email] Sending email from: ${fromEmail} to: ${to}`);
    if (!smtpUser && !defaultFromEmail && !from) {
      console.warn(
        `[Email] No 'from' address specified. Using fallback: ${fromEmail}\n` +
        `Set SMTP_FROM_EMAIL or SMTP_USER to customize the sender address.`
      );
    }
  }

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

      // For other errors or final attempt, provide helpful error message
      const errorMessage = err.message || String(error);
      
      // Check for common authentication errors and provide helpful guidance
      if (err.code === 'EAUTH' || errorMessage.includes('Application-specific password')) {
        console.error(
          "[Email] Authentication failed. Common causes:\n" +
          "1. Gmail requires an App Password (not your regular password) if 2FA is enabled\n" +
          "2. Generate an App Password at: https://myaccount.google.com/apppasswords\n" +
          "3. Make sure SMTP_USER and SMTP_PASS are set correctly in your .env.local file\n" +
          "4. Ensure you're using smtp.gmail.com (not smtp-relay.gmail.com) with credentials"
        );
      } else if (errorMessage.includes('Invalid login')) {
        console.error(
          "[Email] Invalid login credentials. Please check:\n" +
          "1. SMTP_USER should be your full Gmail address (e.g., yourname@gmail.com)\n" +
          "2. SMTP_PASS should be an App Password (16 characters, no spaces)\n" +
          "3. Make sure 2-Step Verification is enabled in your Google Account"
        );
      }
      
      console.error("Failed to send email:", error);
      throw error;
    }
  }

  // If we exhausted all retries, throw the last error
  if (lastError) {
    throw lastError;
  }
}
