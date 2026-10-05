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

/**
 * A company's scans, newest first, optionally for one event -- matched on the
 * scanned registration's form-version metadata (`event_id`), or by form name
 * for older links. The filter runs in the database; the route used to load
 * every scan the company ever made and filter in JavaScript.
 */
export async function listCompanyScans(
  companyId: string,
  filter: { eventId?: string | null; eventName?: string | null } = {}
) {
  const scans = await prisma.attendantScan.findMany({
    where: {
      OR: [
        { company_id: companyId },
        { scannedBy: { is: { company_id: companyId } } },
      ],
      ...(filter.eventId || filter.eventName
        ? {
            formResponse: {
              is: {
                formVersion: {
                  is: {
                    ...(filter.eventId ? { metadata: { path: ["event_id"], equals: filter.eventId } } : {}),
                    ...(filter.eventName ? { form: { is: { name: filter.eventName } } } : {}),
                  },
                },
              },
            },
          }
        : {}),
    },
    include: {
      scannedBy: { select: { first_name: true, last_name: true, email: true } },
      formResponse: {
        include: { formVersion: { include: { form: true } } },
      },
    },
    orderBy: { scanned_at: "desc" },
  });

  return scans.map((scan) => ({
    id: scan.id,
    attendant_uuid: scan.attendant_uuid,
    scanned_at: scan.scanned_at?.toISOString(),
    liked: scan.liked,
    comment: scan.comment,
    feedback_updated_at: scan.feedback_updated_at?.toISOString(),
    scanned_by: {
      name:
        [scan.scannedBy?.first_name, scan.scannedBy?.last_name]
          .filter(Boolean)
          .join(" ") ||
        scan.scannedBy?.email ||
        "Unknown",
      email: scan.scannedBy?.email || "",
    },
    form_response_id: scan.formResponse
      ? {
          data: scan.formResponse.data,
          submitted_at: scan.formResponse.submitted_at?.toISOString(),
          form_version_id: scan.formResponse.formVersion
            ? {
                metadata: scan.formResponse.formVersion.metadata,
                form_id: scan.formResponse.formVersion.form,
              }
            : null,
        }
      : null,
  }));
}
