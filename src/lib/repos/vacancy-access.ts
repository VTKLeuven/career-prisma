import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Bookkeeping for the "your company can now post vacancies" mail (BR-24).
 * The mail itself lives in lib/vacancy-access-notification.ts; this file only
 * reads and writes `companies.vacancy_access_notified_at`.
 */

/** Whether any of these sub-options carries the `vacancies` grant (lib/grants.ts). */
export async function subOptionsGrantVacancies(subOptionIds: number[]): Promise<boolean> {
  if (subOptionIds.length === 0) return false;
  const grant = await prisma.careerSubOptionGrant.findFirst({
    where: { career_sub_option_id: { in: subOptionIds }, type: "vacancies" },
    select: { id: true },
  });
  return grant != null;
}

export type VacancyAccessClaim = {
  companyName: string;
  academicYearName: string;
  recipients: { email: string; first_name: string | null; last_name: string | null }[];
  /** The timestamp this claim wrote, and the one it replaced -- for releaseVacancyAccessNotification(). */
  claimedAt: Date;
  previous: Date | null;
};

/**
 * Reserves this academic year's notification for a company, or returns null
 * when there is nothing to send:
 *
 *  - The sale's year is not running now. A sale for a past year is a backfill,
 *    and one for a coming year only grants access once that year starts --
 *    the time-based switch in shapeCompany(), which must not mail anyone.
 *  - The company was already notified on or after the start of that year.
 *
 * The check and the write are one conditional UPDATE, so two sales recorded
 * at the same moment cannot both win and mail twice.
 */
export async function claimVacancyAccessNotification(
  companyId: string,
  academicYearId: number
): Promise<VacancyAccessClaim | null> {
  const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!year?.start_of_year || !year.end_of_year) return null;
  const now = new Date();
  if (year.start_of_year > now || year.end_of_year < now) return null;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, vacancy_access_notified_at: true },
  });
  if (!company) return null;

  const claimed = await prisma.company.updateMany({
    where: {
      id: companyId,
      OR: [
        { vacancy_access_notified_at: null },
        { vacancy_access_notified_at: { lt: year.start_of_year } },
      ],
    },
    data: { vacancy_access_notified_at: now },
  });
  if (claimed.count === 0) return null;

  // Representatives whose account is live or waiting on its invitation -- the
  // same two statuses the password-reset mail serves.
  const recipients = await prisma.user.findMany({
    where: { company_id: companyId, status: { in: ["active", "invited"] }, email: { not: null } },
    select: { email: true, first_name: true, last_name: true },
  });

  return {
    companyName: company.name ?? "",
    academicYearName: year.name ?? "",
    recipients: recipients
      .filter((r): r is typeof r & { email: string } => Boolean(r.email?.trim()))
      .map((r) => ({ email: r.email.trim(), first_name: r.first_name, last_name: r.last_name })),
    claimedAt: now,
    previous: company.vacancy_access_notified_at,
  };
}

/**
 * Gives a claim back when its mail could not be sent, so the next sale tries
 * again. Only undoes our own write: if something has claimed since, it stays.
 */
export async function releaseVacancyAccessNotification(
  companyId: string,
  claim: Pick<VacancyAccessClaim, "claimedAt" | "previous">
): Promise<void> {
  await prisma.company.updateMany({
    where: { id: companyId, vacancy_access_notified_at: claim.claimedAt },
    data: { vacancy_access_notified_at: claim.previous },
  });
}
