import "server-only";

import { after } from "next/server";
import { sendEmail } from "@/lib/email";
import { generateVacancyAccessEmailHtml } from "@/lib/email-templates";
import type { VacancyAccessTrigger } from "@/lib/repos/option-sales";
import {
  claimVacancyAccessNotification,
  releaseVacancyAccessNotification,
} from "@/lib/repos/vacancy-access";

/**
 * BR-24: a company's representatives get one mail when the company gains
 * access to the vacancy platform.
 *
 * What triggers it is deliberately narrow: an admin recording a sale that
 * carries the `vacancies` grant -- a new sale, or a cancelled one sold again
 * (lib/repos/option-sales.ts reports both). Everything else that can make
 * `hasGrant(company, "vacancies")` true stays silent:
 *
 *  - attaching the grant to a sub-option that was already sold (retroactive);
 *  - a sale recorded for a year that is not running now (a backfill, or a
 *    coming year whose access only starts with the year);
 *  - the new academic year starting, which shapeCompany() derives from the
 *    clock with no write at all.
 *
 * `companies.vacancy_access_notified_at` keeps it to one mail per company per
 * academic year (claimVacancyAccessNotification()). Delivery goes through
 * sendEmail(), so the dev site and a local build without SMTP settings log the
 * mail instead of sending it, like every other mail.
 */

function applicationUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_FORM_DOMAIN ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

async function notifyVacancyAccess({ companyId, academicYearId }: NonNullable<VacancyAccessTrigger>) {
  const claim = await claimVacancyAccessNotification(companyId, academicYearId);
  if (!claim) return;

  if (claim.recipients.length === 0) {
    // Nobody to tell yet. Keep the claim anyway: a representative added later
    // is invited into a company that already has access, which is not news.
    console.log(`[vacancy-access] Company ${companyId} gained vacancy access but has no representatives to mail`);
    return;
  }

  const vacanciesUrl = `${applicationUrl()}/dashboard/job-platform/vacancies`;
  const subject = `Vacancy platform access${claim.companyName ? ` - ${claim.companyName}` : ""} - VTK Career`;
  const results = await Promise.allSettled(
    claim.recipients.map((rep) =>
      sendEmail({
        to: rep.email,
        subject,
        html: generateVacancyAccessEmailHtml({
          firstName: rep.first_name ?? undefined,
          lastName: rep.last_name ?? undefined,
          companyName: claim.companyName,
          academicYearName: claim.academicYearName,
          vacanciesUrl,
        }),
      })
    )
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length === 0) return;
  console.error(
    `[vacancy-access] ${failed.length} of ${results.length} mail(s) for company ${companyId} failed:`,
    failed.map((r) => (r as PromiseRejectedResult).reason)
  );
  // Nobody heard: give the year back so the next qualifying sale retries.
  // When only some failed, keep it -- retrying would mail the others twice.
  if (failed.length === results.length) {
    await releaseVacancyAccessNotification(companyId, claim);
  }
}

/**
 * Mails the company's representatives after the response is sent, so a slow
 * or retrying SMTP server never holds up the admin who recorded the sale, and
 * a failed mail never fails the sale. Call it with what createOptionSale() /
 * createSubOptionSale() returned; null is a no-op.
 */
export function scheduleVacancyAccessNotification(trigger: VacancyAccessTrigger): void {
  if (!trigger) return;
  after(async () => {
    try {
      await notifyVacancyAccess(trigger);
    } catch (error) {
      console.error(`[vacancy-access] Notification for company ${trigger.companyId} failed:`, error);
    }
  });
}
