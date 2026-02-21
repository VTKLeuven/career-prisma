import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { listFavourites } from "@/lib/repos/cv-book-favourites";

export const dynamic = "force-dynamic";

/**
 * GET /api/cv-book/favourites?cvBookId=...&companyId=...
 * Returns favourite form response IDs for the given CV book and company.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cvBookId = searchParams.get("cvBookId");
    const companyId = searchParams.get("companyId");

    if (!cvBookId || !companyId) {
      return NextResponse.json(
        { error: "cvBookId and companyId required" },
        { status: 400 }
      );
    }

    const user = await getUserFromCookies();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userCompanyId =
      user.company && (typeof user.company === "string" ? user.company : user.company.id);
    if (!userCompanyId || userCompanyId !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ids = await listFavourites(companyId, cvBookId);
    return NextResponse.json(ids);
  } catch (error) {
    console.error("[API cv-book/favourites] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch favourites" },
      { status: 500 }
    );
  }
}
