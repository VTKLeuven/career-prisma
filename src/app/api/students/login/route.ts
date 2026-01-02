// app/api/students/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findStudentByEmail } from "@/lib/repos/students";

const STUDENT_SESSION_COOKIE = "student_session";

export async function POST(req: Request) {
  try {
    const { email, password, rememberMe } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    // Find student by email
    const student = await findStudentByEmail(email);
    
    if (!student) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Check if student has a password set
    if (!student.password) {
      return NextResponse.json({ 
        error: "No password set for this account. Please verify your email first." 
      }, { status: 401 });
    }

    // Check if student is verified
    if (!student.verified) {
      return NextResponse.json({ 
        error: "Please verify your email before logging in." 
      }, { status: 401 });
    }

    // Hash the provided password and compare
    const crypto = await import("crypto");
    const passwordHash = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    if (passwordHash !== student.password) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Set student session cookie
    const response = NextResponse.json({ 
      success: true,
      message: "Login successful" 
    });

    const url = new URL(req.url);
    const xfProto = (typeof req.headers.get === "function" && req.headers.get("x-forwarded-proto")) || "";
    const isSecure = url.protocol === "https:" || xfProto.includes("https") || process.env.NODE_ENV === "production";

    const cookieStore = await cookies();
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 1 day

    cookieStore.set(STUDENT_SESSION_COOKIE, student.id, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: maxAge,
    });

    return response;
  } catch (error) {
    console.error("Student login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}

