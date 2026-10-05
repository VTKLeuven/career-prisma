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
      ...companyScanScope(companyId),
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

/** Scans visible to a company: its own, or made by one of its users. */
function companyScanScope(companyId: string) {
  return {
    OR: [
      { company_id: companyId },
      { scannedBy: { is: { company_id: companyId } } },
    ],
  };
}

/** One of a company's scans with the attendant's registration, or null. */
export async function getCompanyScan(scanId: string, companyId: string) {
  const scan = await prisma.attendantScan.findFirst({
    where: { id: scanId, ...companyScanScope(companyId) },
    include: {
      scannedBy: { select: { first_name: true, last_name: true, email: true } },
      formResponse: true,
    },
  });
  if (!scan) return null;
  return {
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
        }
      : null,
  };
}

/** A company's feedback on a scan: the favourite flag and/or the comment. */
export async function updateScanFeedback(scanId: string, feedback: { liked?: boolean; comment?: string }): Promise<void> {
  await prisma.attendantScan.update({
    where: { id: scanId },
    data: {
      ...(feedback.liked !== undefined && { liked: feedback.liked }),
      ...(feedback.comment !== undefined && { comment: feedback.comment }),
      feedback_updated_at: new Date(),
    },
  });
}

export async function deleteScan(scanId: string): Promise<void> {
  await prisma.attendantScan.delete({ where: { id: scanId } });
}

/** The live registration behind an attendant QR code, or null. */
export async function getAttendantRegistration(uuid: string) {
  return prisma.formResponse.findFirst({
    where: { attendant_uuid: uuid, archived: { not: true } },
    include: { formVersion: { include: { form: true } } },
  });
}

/**
 * A company rep scans an attendant: records the scan once per company. Returns
 * the scan's id and whether it already existed, or null when the QR code
 * belongs to no live registration.
 */
export async function recordAttendantScan(
  uuid: string,
  companyId: string,
  scannedBy: string
): Promise<{ scanId: string; existed: boolean } | null> {
  const response = await prisma.formResponse.findFirst({
    where: { attendant_uuid: uuid, archived: { not: true } },
    select: { id: true },
  });
  if (!response) return null;

  const existing = await prisma.attendantScan.findFirst({
    where: { attendant_uuid: uuid, ...companyScanScope(companyId) },
    orderBy: { scanned_at: "desc" },
    select: { id: true },
  });
  if (existing) return { scanId: existing.id, existed: true };

  const scan = await prisma.attendantScan.create({
    data: {
      attendant_uuid: uuid,
      form_response_id: response.id,
      company_id: companyId,
      scanned_by: scannedBy,
      scanned_at: new Date(),
    },
  });
  return { scanId: scan.id, existed: false };
}
