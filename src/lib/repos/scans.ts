// lib/repos/scans.ts -- attendant scans: a company rep scanning a student's QR.
import "server-only";

import prisma from "@/lib/prisma";

/**
 * Ids of the events a company has scans for, read from the scanned
 * registrations' form-version metadata. One query for the distinct versions,
 * where the sidebar used to download every scan with its form response.
 */
export async function listScannedEventIdsForCompany(companyId: string): Promise<string[]> {
  const versions = await prisma.formVersion.findMany({
    where: {
      formResponses: {
        some: {
          attendantScans: {
            some: {
              OR: [
                { company_id: companyId },
                { scannedBy: { is: { company_id: companyId } } },
              ],
            },
          },
        },
      },
    },
    select: { metadata: true },
  });
  const ids = new Set<string>();
  for (const { metadata } of versions) {
    const eventId = (metadata as { event_id?: unknown } | null)?.event_id;
    if (typeof eventId === "string" && eventId) ids.add(eventId);
  }
  return [...ids];
}
