// lib/repos/directus.ts
"use server";

import { cookies } from "next/headers";
import nodemailer from "nodemailer";

export async function uploadDirectusFile(file: File): Promise<string | null> {
  const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) {
    console.error("No Directus access token found");
    return null;
  }

  const formData = new FormData();
  formData.append("file", file);

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

    return data?.data?.id ?? null;
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

  const smtpHost = process.env.SMTP_HOST || "smtp-relay.gmail.com";
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
    maxConnections: 5, // Limit concurrent connections
    maxMessages: 100, // Max messages per connection before closing
    rateDelta: 1000, // Time window for rate limiting (1 second)
    rateLimit: 5, // Max 5 messages per rateDelta window
    // Optional: Enable connection logging for debugging
    logger: process.env.NODE_ENV === "development",
    debug: process.env.NODE_ENV === "development",
  };

  // Add authentication if credentials are provided (optional for relay services)
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpUser && smtpPass) {
    transportConfig.auth = {
      user: smtpUser,
      pass: smtpPass,
    };
  }

  cachedTransporter = nodemailer.createTransport(transportConfig as nodemailer.TransportOptions);
  return cachedTransporter;
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
  const defaultFromEmail = process.env.SMTP_FROM_EMAIL;

  // Determine the from email: function parameter > env variable > fallback
  const fromEmail = from || defaultFromEmail || "noreply@example.com";

  const transporter = getTransporter();

  // Retry logic for rate-limited connections
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
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

      const errorCode = err.code;
      const responseCode = err.responseCode;

      // If it's a rate limit error (421) and we have retries left, wait and retry
      if ((errorCode === 'ECONNECTION' || responseCode === 421) && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.warn(`Email send attempt ${attempt} failed with rate limit. Retrying in ${waitTime}ms...`);
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
