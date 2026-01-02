// app/api/students/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const STUDENT_SESSION_COOKIE = "student_session";

export async function POST(req: Request) {
  try {
    const { email, password, rememberMe } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    // Find student by email - we need to fetch with password field explicitly
    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) {
      return NextResponse.json({ error: "DIRECTUS_URL is not configured." }, { status: 500 });
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;
    
    if (!serverToken) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    // Fetch student with password field explicitly
    const studentRes = await fetch(
      `${normalizedBase}items/students?filter[email][_eq]=${encodeURIComponent(email)}&fields=id,email,password,verified,username,first_name,last_name&limit=1`,
      {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      }
    );

    if (!studentRes.ok) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const studentData = await studentRes.json();
    const students = studentData.data || [];
    
    if (students.length === 0) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const student = students[0];

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
      console.error("[students/login] Password mismatch for student:", student.email);
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

