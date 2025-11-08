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
  console.log("[SMTP] Starting email send process");
  console.log("[SMTP] Recipient:", to);
  console.log("[SMTP] Subject:", subject);

  const smtpHost = process.env.SMTP_HOST || "smtp-relay.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const defaultFromEmail = process.env.SMTP_FROM_EMAIL;

  console.log("[SMTP] Configuration:");
  console.log("[SMTP]   Host:", smtpHost);
  console.log("[SMTP]   Port:", smtpPort);
  console.log("[SMTP]   From email (env):", defaultFromEmail || "not set");

  // Determine the from email: function parameter > env variable > fallback
  const fromEmail = from || defaultFromEmail || "noreply@example.com";
  console.log("[SMTP]   From email (final):", fromEmail);

  // Build transporter config
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
    // Enable connection logging for debugging
    logger: true,
    debug: true,
  };

  console.log("[SMTP] Transport config:");
  console.log("[SMTP]   Secure (SSL):", transportConfig.secure);
  console.log("[SMTP]   Require TLS:", transportConfig.requireTLS);
  console.log("[SMTP]   TLS min version:", transportConfig.tls.minVersion);
  console.log("[SMTP]   TLS reject unauthorized:", transportConfig.tls.rejectUnauthorized);

  // Add authentication if credentials are provided (optional for relay services)
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpUser && smtpPass) {
    transportConfig.auth = {
      user: smtpUser,
      pass: smtpPass,
    };
    console.log("[SMTP]   Authentication: enabled (user:", smtpUser, ")");
  } else {
    console.log("[SMTP]   Authentication: disabled (no credentials provided)");
  }

  console.log("[SMTP] Creating transporter...");
  const transporter = nodemailer.createTransport(transportConfig as nodemailer.TransportOptions);
  console.log("[SMTP] Transporter created successfully");

  // Retry logic for rate-limited connections
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[SMTP] Attempt ${attempt}/${maxRetries} - Preparing to send email...`);
    
    try {
      console.log("[SMTP] Calling transporter.sendMail()...");
      const startTime = Date.now();
      
      await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        html,
      });
      
      const duration = Date.now() - startTime;
      console.log(`[SMTP] Email sent successfully to ${to} (took ${duration}ms)`);
      return; // Success, exit function
    } catch (error) {
      const err = error as Error & { code?: string; responseCode?: number; response?: string; command?: string };
      lastError = err;
      
      console.error(`[SMTP] Attempt ${attempt} failed:`);
      console.error("[SMTP]   Error type:", err.constructor.name);
      console.error("[SMTP]   Error message:", err.message);
      console.error("[SMTP]   Error code:", err.code || "not set");
      console.error("[SMTP]   Response code:", err.responseCode || "not set");
      console.error("[SMTP]   Command:", err.command || "not set");
      if (err.response) {
        console.error("[SMTP]   Response:", err.response);
      }
      if (err.stack) {
        console.error("[SMTP]   Stack trace:", err.stack);
      }

      const errorCode = err.code;
      const responseCode = err.responseCode;

      // If it's a rate limit error (421) and we have retries left, wait and retry
      if ((errorCode === 'ECONNECTION' || responseCode === 421) && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(`[SMTP] Rate limited (421/ECONNECTION), will retry in ${waitTime}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        console.log(`[SMTP] Retry wait complete, attempting again...`);
        continue;
      }

      // For other errors or final attempt, throw immediately
      console.error("[SMTP] Fatal error or max retries reached, throwing error");
      throw error;
    }
  }

  // If we exhausted all retries, throw the last error
  if (lastError) {
    console.error("[SMTP] All retry attempts exhausted, throwing last error");
    throw lastError;
  }
}
