// app/api/admin/event-page/header-buttons/route.ts
import { NextResponse } from "next/server";
import { updateEventPageHeaderButtons } from "@/lib/repos/floorplan";
import { getUserFromCookies } from "@/lib/auth-server";
import { invalidateEventPageCache } from "@/lib/event-page-cache";
import type { HeaderButtonType } from "@/lib/schema";

const VALID_BUTTONS: HeaderButtonType[] = ["floorplan", "company_guide", "cv_upload", "matching_software"];

export async function PATCH(req: Request) {
  try {
    const user = await getUserFromCookies();
    if (!user?.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { eventId, headerButtons } = body as {
      eventId?: string;
      headerButtons?: unknown;
    };

    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid eventId" },
        { status: 400 }
      );
    }

    const buttons = Array.isArray(headerButtons)
      ? headerButtons.filter((b): b is HeaderButtonType =>
          typeof b === "string" && VALID_BUTTONS.includes(b as HeaderButtonType)
        )
      : [];

    const result = await updateEventPageHeaderButtons(eventId, buttons);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to update" },
        { status: 500 }
      );
    }

    // Invalidate event page cache so the public page shows updated header buttons immediately
    invalidateEventPageCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating header buttons:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
