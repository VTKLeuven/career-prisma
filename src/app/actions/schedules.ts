"use server";

import { getSchedulesForEvent, hasSchedulesForEvent, createSchedule, deleteSchedule } from "@/lib/repos/schedule";
import { getCompanySubOptionAnyStatus } from "@/lib/utils/company-access";
import { uploadDirectusFile } from "@/lib/repos/directus";
import type { Company, Schedule, Master } from "@/lib/schema";

/** Extract master IDs from company.category (handles junction { master_id } or { category_id } and direct Master[]). */
function getCompanyMasterIds(company: Company | null | undefined): string[] {
  const raw = company?.category;
  if (!raw || !Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      // master_id relation (junction table)
      const mid = o.master_id ?? o.category_id;
      if (mid != null) {
        if (typeof mid === "string") return mid;
        if (typeof mid === "object" && mid && "id" in (mid as object)) return String((mid as { id: string }).id);
      }
      // Direct master object
      if ("id" in o) return String(o.id);
      return null;
    })
    .filter((id): id is string => id != null && id !== "");
}

export async function fetchSchedulesForEventAction(
  eventId: string,
  company?: Company | null
): Promise<Array<Schedule & { master?: Master; pdf?: { id?: string } }>> {
  try {
    // Companies with "Student Schedules" sub-option get schedules (filtered by category when set)
    const hasStudentSchedules = company ? getCompanySubOptionAnyStatus(company, "Student Schedules") !== null : false;

    if (!hasStudentSchedules || !company) {
      return [];
    }

    const masterIds = getCompanyMasterIds(company);
    // When company has category: filter schedules by those masters. When empty: show all schedules for the event.
    return getSchedulesForEvent(eventId, masterIds.length > 0 ? masterIds : undefined);
  } catch (error) {
    console.error("[fetchSchedulesForEventAction]", error);
    return [];
  }
}

/** Check if an event has any schedules (for header button visibility). */
export async function hasSchedulesForEventAction(eventId: string): Promise<boolean> {
  return hasSchedulesForEvent(eventId);
}

/** Fetch all schedules for an event (admin - no company filter). */
export async function fetchSchedulesForEventAdminAction(
  eventId: string
): Promise<Array<Schedule & { master?: Master; pdf?: { id?: string } }>> {
  return getSchedulesForEvent(eventId);
}

/** Delete a schedule (admin only). */
export async function deleteScheduleAction(id: string): Promise<{ success: boolean; error?: string }> {
  return deleteSchedule(id);
}

/** Create schedule with PDF file upload. */
export async function createScheduleWithFileAction(
  eventId: string,
  masterId: string,
  file: File
): Promise<{ success: boolean; error?: string }> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { success: false, error: "File must be a PDF" };
  }
  const pdfId = await uploadDirectusFile(file);
  if (!pdfId) return { success: false, error: "Failed to upload PDF" };
  return createSchedule({ event: eventId, master: masterId, pdf: pdfId });
}
