// app/api/students/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const STUDENT_COLLECTION = "students";
const STUDENT_SESSION_COOKIE = "student_session";

// GET: Validate verification token
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "DIRECTUS_URL not configured" },
        { status: 500 }
      );
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;

    if (!serverToken) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Decode token to get student ID
    let studentId: string;
    let randomToken: string;
    try {
      const decoded = Buffer.from(token, "base64url").toString();
      const [id, tok] = decoded.split(":");
      if (!id || !tok) {
        throw new Error("Invalid token format");
      }
      studentId = id;
      randomToken = tok;
    } catch {
      return NextResponse.json(
        { error: "Invalid verification token format" },
        { status: 400 }
      );
    }

    // Fetch student and verify token
    const studentRes = await fetch(
      `${normalizedBase}items/${STUDENT_COLLECTION}/${studentId}?fields=id,email,first_name,last_name,verification_token_hash,verification_token_created,verified`,
      {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      }
    );

    if (!studentRes.ok) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    const studentData = await studentRes.json();
    const student = studentData.data;

    if (!student) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Check if already verified
    if (student.verified) {
      return NextResponse.json(
        { error: "This email has already been verified" },
        { status: 400 }
      );
    }

    // Verify token hash
    if (student.verification_token_hash) {
      const crypto = await import("crypto");
      const tokenHash = crypto
        .createHash("sha256")
        .update(randomToken)
        .digest("hex");

      if (tokenHash !== student.verification_token_hash) {
        return NextResponse.json(
          { error: "Invalid verification token" },
          { status: 400 }
        );
      }

      // Check token expiration (7 days)
      if (student.verification_token_created) {
        const tokenCreated = new Date(student.verification_token_created);
        const daysSinceCreation = (Date.now() - tokenCreated.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation > 7) {
          return NextResponse.json(
            { error: "Verification token has expired. Please register again." },
            { status: 400 }
          );
        }
      }
    }

    // Return student info (don't verify yet - wait for password to be set)
    return NextResponse.json({
      email: student.email,
      firstName: student.first_name,
      lastName: student.last_name,
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { error: "An error occurred while validating the token" },
      { status: 500 }
    );
  }
}

// POST: Verify token and set password
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.DIRECTUS_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "DIRECTUS_URL not configured" },
        { status: 500 }
      );
    }

    const normalizedBase = baseUrl.replace(/\/+$/, "") + "/";
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;

    if (!serverToken) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Decode token to get student ID
    let studentId: string;
    let randomToken: string;
    try {
      const decoded = Buffer.from(token, "base64url").toString();
      const [id, tok] = decoded.split(":");
      if (!id || !tok) {
        throw new Error("Invalid token format");
      }
      studentId = id;
      randomToken = tok;
    } catch {
      return NextResponse.json(
        { error: "Invalid verification token format" },
        { status: 400 }
      );
    }

    // Fetch student and verify token
    const studentRes = await fetch(
      `${normalizedBase}items/${STUDENT_COLLECTION}/${studentId}?fields=id,email,verification_token_hash,verification_token_created,verified,password`,
      {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      }
    );

    if (!studentRes.ok) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    const studentData = await studentRes.json();
    const student = studentData.data;

    if (!student) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Check if already verified
    if (student.verified && student.password) {
      return NextResponse.json(
        { error: "This account has already been verified and password has been set" },
        { status: 400 }
      );
    }

    // Verify token hash
    if (student.verification_token_hash) {
      const crypto = await import("crypto");
      const tokenHash = crypto
        .createHash("sha256")
        .update(randomToken)
        .digest("hex");

      if (tokenHash !== student.verification_token_hash) {
        return NextResponse.json(
          { error: "Invalid verification token" },
          { status: 400 }
        );
      }

      // Check token expiration (7 days)
      if (student.verification_token_created) {
        const tokenCreated = new Date(student.verification_token_created);
        const daysSinceCreation = (Date.now() - tokenCreated.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation > 7) {
          return NextResponse.json(
            { error: "Verification token has expired. Please register again." },
            { status: 400 }
          );
        }
      }
    }

    // Hash password (using bcrypt or similar - for now, store as-is and hash in future)
    // Note: In production, you should hash the password before storing
    const crypto = await import("crypto");
    const passwordHash = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    // Update student: set password, mark as verified, clear verification token
    const updateRes = await fetch(
      `${normalizedBase}items/${STUDENT_COLLECTION}/${studentId}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${serverToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: passwordHash,
          verified: true,
          verification_token_hash: null,
          verification_token_created: null,
        }),
      }
    );

    if (!updateRes.ok) {
      const errorData = await updateRes.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.errors?.[0]?.message || "Failed to set password" },
        { status: 500 }
      );
    }

    // Set student session cookie
    const response = NextResponse.json({ 
      success: true,
      message: "Email verified and password set successfully" 
    });

    const url = new URL(request.url);
    const xfProto = (typeof request.headers.get === "function" && request.headers.get("x-forwarded-proto")) || "";
    const isSecure = url.protocol === "https:" || xfProto.includes("https") || process.env.NODE_ENV === "production";

    response.cookies.set(STUDENT_SESSION_COOKIE, studentId, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Password setup error:", error);
    return NextResponse.json(
      { error: "An error occurred while setting your password" },
      { status: 500 }
    );
  }
}

