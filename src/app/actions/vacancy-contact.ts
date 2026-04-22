"use server";

import { processVacancyContactInquiry } from "@/lib/vacancy-contact-inquiry";

/**
 * Same delivery path as {@link submitContactFormAction} (Contact Us): server action + sendEmail.
 */
export async function submitVacancyContactAction(formData: FormData): Promise<
  { success: true } | { success: false; error: string }
> {
  const result = await processVacancyContactInquiry(formData);
  if (result.success) return { success: true };
  return { success: false, error: result.error };
}
