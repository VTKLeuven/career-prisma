import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      company: user.company ? (typeof user.company === 'string' ? { id: user.company } : user.company) : null,
      admin: user.admin,
    });
  } catch (error) {
    return NextResponse.json(
      { authenticated: false },
      { status: 200 }
    );
  }
}

