import { NextResponse, type NextRequest } from "next/server";
import { validateInviteToken } from "@/lib/invite-token";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Invite token is required" }, { status: 400 });
  }
  const user = await validateInviteToken(token);
  if (!user) {
    return NextResponse.json(
      { error: "This invitation is invalid, expired, or already used" },
      { status: 400 }
    );
  }
  return NextResponse.json({
    user: { id: user.id, email: user.email },
    company: user.company
      ? {
          ...user.company,
          logo: user.company.logo_id,
          page_image: user.company.page_image,
        }
      : null,
  });
}
