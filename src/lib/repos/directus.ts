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
  const smtpHost = process.env.SMTP_HOST || "smtp-relay.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const defaultFromEmail = process.env.SMTP_FROM_EMAIL;

  // Determine the from email: function parameter > env variable > fallback
  const fromEmail = from || defaultFromEmail || "noreply@example.com";

  // Build transporter config
  const transportConfig = {
    host: smtpHost,
    port: smtpPort,
    secure: false, // true for 465, false for other ports
    tls: {
      rejectUnauthorized: false,
    },
    auth: undefined as { user: string; pass: string } | undefined,
  };

  const transporter = nodemailer.createTransport(transportConfig);

  await transporter.sendMail({
    from: fromEmail,
    to,
    subject,
    html,
  });
}
