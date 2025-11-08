"use server";

import { sendEmail } from "@/lib/repos/directus";

export async function submitContactFormAction(data: {
  name: string;
  surname: string;
  email: string;
  companyName?: string;
  reason: string;
}) {
  try {
    const { name, surname, email, companyName, reason } = data;

    // Validate required fields
    if (!name || !surname || !email || !reason) {
      return { success: false, error: "All fields are required" };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: "Invalid email format" };
    }

    // Create HTML email content
    const htmlContent = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name} ${surname}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${companyName ? `<p><strong>Company Name:</strong> ${companyName}</p>` : ''}
      <p><strong>Reason for Contact:</strong></p>
      <p>${reason.replace(/\n/g, '<br>')}</p>
    `;

    // Send email to bedrijvenrelaties@vtk.be
    await sendEmail({
      to: "bedrijvenrelaties@vtk.be",
      subject: `Contact Form Submission from ${name} ${surname}`,
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error("Error submitting contact form:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send message. Please try again later." 
    };
  }
}

