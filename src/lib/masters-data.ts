import "server-only";

import { fetchMastersAction } from "@/app/actions/features";
import { getCachedOurStudents, setCachedOurStudents } from "@/lib/our-students-cache";
import type { Master } from "@/lib/schema";

/**
 * Every master, through the our-students cache (dropped when masters change).
 * /our-students renders it on the server; /api/masters serves it.
 */
export async function loadPublicMasters(): Promise<Master[]> {
  const cached = getCachedOurStudents() as Master[] | null;
  if (cached) return cached;
  const masters = (await fetchMastersAction()) as Master[];
  setCachedOurStudents(masters);
  return masters;
}
