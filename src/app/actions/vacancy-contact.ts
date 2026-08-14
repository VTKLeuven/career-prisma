"use server";

import { processVacancyContactInquiry } from "@/lib/vacancy-contact-inquiry";
import { isDevEnvironment } from "@/lib/dev-environment";

/**
 * Same delivery path as {@link submitContactFormAction} (Contact Us): server action + sendEmail.
 */
export async function submitVacancyContactAction(formData: FormData): Promise<
  { success: true } | { success: false; error: string }
> {
  // The job platform is dev-only, so nothing on production should be sending
  // these. Refusing here keeps the mail path from being usable as an open relay
  // for a feature that is meant to be off.
  if (!isDevEnvironment()) {
    return {
      success: false,
      error: "The vacancy platform is not available on this environment",
    };
  }

  const result = await processVacancyContactInquiry(formData);
  if (result.success) return { success: true };
  return { success: false, error: result.error };
}
