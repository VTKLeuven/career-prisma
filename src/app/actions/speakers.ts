"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth-server";
import {
  listSpeakers,
  createSpeaker,
  updateSpeaker,
  deleteSpeaker,
} from "@/lib/repos/speakers";
import { listUsersBasic } from "@/lib/repos/users";
import type { ActionResult, SelectOption } from "@/components/admin/types";
import type { Speaker } from "@/lib/schema";

export async function listSpeakersAction(): Promise<Speaker[]> {
  await requireAdminUser();
  return listSpeakers({ limit: 1000 });
}

/** Users available to be a speaker's representative, formatted for a dropdown. */
export async function listRepresentativeOptionsAction(): Promise<SelectOption[]> {
  await requireAdminUser();
  const users = await listUsersBasic();
  return users.map((u) => ({
    value: u.id,
    label:
      [u.first_name, u.last_name].filter(Boolean).join(" ") ||
      u.email ||
      u.id,
  }));
}

export async function createSpeakerAction(data: Record<string, unknown>): Promise<ActionResult<Speaker>> {
  try {
    await requireAdminUser();
    const speaker = await createSpeaker(data);
    revalidatePath("/admin/speakers");
    return { success: true, data: speaker };
  } catch (error) {
    console.error("[createSpeakerAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create speaker" };
  }
}

export async function updateSpeakerAction(id: string, data: Record<string, unknown>): Promise<ActionResult<Speaker>> {
  try {
    await requireAdminUser();
    const speaker = await updateSpeaker(Number(id), data);
    revalidatePath("/admin/speakers");
    return { success: true, data: speaker };
  } catch (error) {
    console.error("[updateSpeakerAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update speaker" };
  }
}

export async function deleteSpeakerAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminUser();
    await deleteSpeaker(Number(id));
    revalidatePath("/admin/speakers");
    return { success: true };
  } catch (error) {
    console.error("[deleteSpeakerAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete speaker" };
  }
}
