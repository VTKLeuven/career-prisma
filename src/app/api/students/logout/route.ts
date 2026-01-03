// app/api/students/logout/route.ts
import { NextResponse } from "next/server";
import { clearStudentSession } from "@/lib/auth-student";

const STUDENT_SESSION_COOKIE = "student_session";

export async function POST(req: Request) {
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

    return res;
  } catch (error) {
    console.error("Student logout error:", error);
    return NextResponse.json({ ok: true }); // Still return success to clear client state
  }
}

