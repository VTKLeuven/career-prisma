// app/api/students/logout/route.ts
import { NextResponse } from "next/server";
import { clearStudentSession } from "@/lib/auth-student";
import { SSO_HINT_COOKIE, flowCookieDomain } from "@/lib/vtk-sso";
import type { NextRequest } from "next/server";

const STUDENT_SESSION_COOKIE = "student_session";

export async function POST(req: NextRequest) {
  try {
    // Clear student session using the server function
    await clearStudentSession();

    // Also manually clear the cookie in the response for good measure
    const url = new URL(req.url);
    const xfProto = (typeof req.headers.get === "function" && req.headers.get("x-forwarded-proto")) || "";
    const isSecure = url.protocol === "https:" || xfProto.includes("https") || process.env.NODE_ENV === "production";

    const res = NextResponse.json({ ok: true });

    const deleteOpts = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: isSecure,
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    };

    res.cookies.set(STUDENT_SESSION_COOKIE, "", deleteOpts);

    // Clear the SSO hint too. It is what makes an expired session bounce
    // silently back through the SSO, so leaving it behind would sign the
    // student straight back in the moment they hit a page that needs them.
    res.cookies.set(SSO_HINT_COOKIE, "", {
      ...deleteOpts,
      domain: flowCookieDomain(req),
    });

    return res;
  } catch (error) {
    console.error("Student logout error:", error);
    return NextResponse.json({ ok: true }); // Still return success to clear client state
  }
}

