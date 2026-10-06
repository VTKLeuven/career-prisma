"use server";

import { getSchedulesForEvent, hasSchedulesForEvent, createSchedule, deleteSchedule } from "@/lib/repos/schedule";
import { getCompanySubOptionAnyStatus } from "@/lib/utils/company-access";
import { uploadFile } from "@/lib/file-storage";
import { getEventName, getEventTimes } from "@/lib/repos/event";
import { isDuringEvent } from "@/lib/utils/events";
import { fetchCompanyByIdAction } from "@/app/actions/companies";
import type { CareerEvent, Company, Schedule, Master } from "@/lib/schema";
import { getUserFromCookies, requireAdminUser } from "@/lib/auth-server";

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

export type CompanySchedules =
  | { status: "no_access"; eventName: string }
  | { status: "not_during_event"; eventName: string }
  | { status: "ok"; eventName: string; schedules: Array<Schedule & { master?: Master; pdf?: { id?: string } }> };

/**
 * The student schedules the signed-in rep's company may open for an event.
 * Everything is decided here: the company and its "Student Schedules" option
 * are loaded from the session, and the event's hours are checked in Brussels
 * time. It used to take the company object from the caller -- whose options a
 * rep could fake -- and leave the hours check to the browser.
 */
export async function fetchSchedulesForEventAction(eventId: string): Promise<CompanySchedules> {
  let eventName = "";
  try {
    const user = await getUserFromCookies();
    const companyId = user?.company?.id;
    const [company, times, name] = await Promise.all([
      companyId ? fetchCompanyByIdAction(companyId, false, true) : Promise.resolve(null),
      getEventTimes(eventId),
      getEventName(eventId),
    ]);
    eventName = name ?? "";

    if (!company || getCompanySubOptionAnyStatus(company, "Student Schedules") === null) {
      return { status: "no_access", eventName };
    }
    if (!times || !isDuringEvent(times as CareerEvent)) {
      return { status: "not_during_event", eventName };
    }

    const masterIds = getCompanyMasterIds(company);
    // When company has category: filter schedules by those masters. When empty: show all schedules for the event.
    const schedules = await getSchedulesForEvent(eventId, masterIds.length > 0 ? masterIds : undefined);
    return { status: "ok", eventName, schedules };
  } catch (error) {
    console.error("[fetchSchedulesForEventAction]", error);
    return { status: "no_access", eventName };
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
  await requireAdminUser();
  return getSchedulesForEvent(eventId);
}

/** Delete a schedule (admin only). */
export async function deleteScheduleAction(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAdminUser();
  return deleteSchedule(id);
}

/** Create schedule with PDF file upload. */
export async function createScheduleWithFileAction(
  eventId: string,
  masterId: string,
  file: File
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAdminUser();
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { success: false, error: "File must be a PDF" };
  }
  const pdfId = await uploadFile(file, user.id);
  if (!pdfId) return { success: false, error: "Failed to upload PDF" };
  return createSchedule({ event: eventId, master: masterId, pdf: pdfId });
}
