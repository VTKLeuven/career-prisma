// lib/repos/directus.ts
"use server";

import { cookies } from "next/headers";

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
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY missing");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "", // TODO: create domain in resend
      to,
      subject,
      html,
    }),
  });
}
