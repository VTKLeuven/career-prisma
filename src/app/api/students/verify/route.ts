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

    console.log("[verify-student GET] Received verification request");

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
      console.log("[verify-student GET] Decoding token:", token.substring(0, 20) + "...");
      const decoded = Buffer.from(token, "base64url").toString();
      console.log("[verify-student GET] Decoded token:", decoded.substring(0, 50) + "...");
      const [id, tok] = decoded.split(":");
      if (!id || !tok) {
        console.error("[verify-student GET] Invalid token format - missing colon separator");
        throw new Error("Invalid token format");
      }
      studentId = id;
      randomToken = tok;
      console.log("[verify-student GET] Extracted studentId:", studentId, "token length:", randomToken.length);
    } catch (error) {
      console.error("[verify-student GET] Token decode error:", error);
      return NextResponse.json(
        { error: "Invalid verification token format" },
        { status: 400 }
      );
    }

    // Fetch student using server token - try without fields first to get all accessible fields
    let fetchUrl = `${normalizedBase}items/${STUDENT_COLLECTION}/${studentId}`;
    console.log("[verify-student GET] Fetching student from:", fetchUrl);
    console.log("[verify-student GET] Student ID from token:", studentId);
    console.log("[verify-student GET] Using server token for admin access");
    
    let studentRes = await fetch(fetchUrl, {
      headers: {
        "Authorization": `Bearer ${serverToken}`,
      },
    });

    console.log("[verify-student GET] Fetch response status:", studentRes.status, studentRes.statusText);

    // If that fails, try with basic fields only
    if (!studentRes.ok) {
      console.log("[verify-student GET] Full fetch failed, trying with basic fields");
      fetchUrl = `${normalizedBase}items/${STUDENT_COLLECTION}/${studentId}?fields=id,email,first_name,last_name,verification_token_hash,verification_token_created,verified`;
      studentRes = await fetch(fetchUrl, {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      });
      console.log("[verify-student GET] Basic fields fetch status:", studentRes.status);
    }

    // If still fails, try with minimal fields
    if (!studentRes.ok) {
      console.log("[verify-student GET] Basic fields failed, trying minimal fields");
      fetchUrl = `${normalizedBase}items/${STUDENT_COLLECTION}/${studentId}?fields=id,email,first_name,last_name`;
      studentRes = await fetch(fetchUrl, {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      });
      console.log("[verify-student GET] Minimal fields fetch status:", studentRes.status);
    }

    if (!studentRes.ok) {
      const errorText = await studentRes.text().catch(() => "Could not read error");
      console.error("[verify-student GET] All fetch attempts failed:", errorText);
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    const studentData = await studentRes.json();
    const student = studentData.data;

    // Always log for debugging
    console.log("[verify-student GET] Student data response:", JSON.stringify(studentData, null, 2));

    if (!student) {
      console.error("[verify-student GET] Student not found for ID", studentId);
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Get token hash from metadata or direct fields (server token should have access to both)
    const metadata = student.metadata || {};
    const tokenHash = student.verification_token_hash || metadata.verification_token_hash;
    const tokenCreated = student.verification_token_created || metadata.verification_token_created;
    const isVerified = student.verified === true || student.verified === 1;

    // Debug logging
    console.log("[verify-student GET] Student found:", {
      id: student.id,
      email: student.email,
      verified: isVerified,
      hasTokenHash: !!tokenHash,
      tokenHashSource: student.verification_token_hash ? "direct" : (metadata.verification_token_hash ? "metadata" : "none"),
      tokenHashValue: tokenHash ? `${tokenHash.substring(0, 20)}...` : null,
      tokenCreated: tokenCreated,
      allFields: Object.keys(student),
      metadataKeys: metadata ? Object.keys(metadata) : [],
    });

    // Check if already verified
    if (isVerified) {
      return NextResponse.json(
        { error: "This email has already been verified" },
        { status: 400 }
      );
    }

    // Verify token hash
    if (!tokenHash) {
      console.error("[verify-student GET] Missing verification_token_hash for student", studentId);
      console.error("[verify-student GET] Student data:", JSON.stringify(student, null, 2));
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    const crypto = await import("crypto");
    const computedTokenHash = crypto
      .createHash("sha256")
      .update(randomToken)
      .digest("hex");

    if (computedTokenHash !== tokenHash) {
      console.error("[verify-student GET] Token hash mismatch for student", studentId);
      console.error("[verify-student GET] Expected:", tokenHash);
      console.error("[verify-student GET] Got:", computedTokenHash);
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 400 }
      );
    }

    // Check token expiration (7 days)
    if (tokenCreated) {
      const tokenCreatedDate = new Date(tokenCreated);
      const daysSinceCreation = (Date.now() - tokenCreatedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 7) {
        return NextResponse.json(
          { error: "Verification token has expired. Please register again." },
          { status: 400 }
        );
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

    // Fetch student using server token - try without fields first to get all accessible fields
    let fetchUrl = `${normalizedBase}items/${STUDENT_COLLECTION}/${studentId}`;
    console.log("[verify-student POST] Fetching student from:", fetchUrl);
    console.log("[verify-student POST] Using server token for admin access");
    
    let studentRes = await fetch(fetchUrl, {
      headers: {
        "Authorization": `Bearer ${serverToken}`,
      },
    });

    // If that fails, try with basic fields only
    if (!studentRes.ok) {
      console.log("[verify-student POST] Full fetch failed, trying with basic fields");
      fetchUrl = `${normalizedBase}items/${STUDENT_COLLECTION}/${studentId}?fields=id,email,password,verification_token_hash,verification_token_created,verified`;
      studentRes = await fetch(fetchUrl, {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      });
      console.log("[verify-student POST] Basic fields fetch status:", studentRes.status);
    }

    // If still fails, try with minimal fields
    if (!studentRes.ok) {
      console.log("[verify-student POST] Basic fields failed, trying minimal fields");
      fetchUrl = `${normalizedBase}items/${STUDENT_COLLECTION}/${studentId}?fields=id,email,password`;
      studentRes = await fetch(fetchUrl, {
        headers: {
          "Authorization": `Bearer ${serverToken}`,
        },
      });
      console.log("[verify-student POST] Minimal fields fetch status:", studentRes.status);
    }

    if (!studentRes.ok) {
      const errorText = await studentRes.text().catch(() => "Could not read error");
      console.error("[verify-student POST] All fetch attempts failed:", errorText);
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

    // Get token hash from metadata or direct fields (server token should have access to both)
    const metadata = student.metadata || {};
    const tokenHash = student.verification_token_hash || metadata.verification_token_hash;
    const tokenCreated = student.verification_token_created || metadata.verification_token_created;
    const isVerified = student.verified === true || student.verified === 1;

    // Check if already verified
    if (isVerified && student.password) {
      return NextResponse.json(
        { error: "This account has already been verified and password has been set" },
        { status: 400 }
      );
    }

    // Verify token hash
    if (!tokenHash) {
      console.error("[verify-student POST] Missing verification_token_hash for student", studentId);
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    const crypto = await import("crypto");
    const computedTokenHash = crypto
      .createHash("sha256")
      .update(randomToken)
      .digest("hex");

    if (computedTokenHash !== tokenHash) {
      console.error("[verify-student POST] Token hash mismatch for student", studentId);
      console.error("[verify-student POST] Expected:", tokenHash);
      console.error("[verify-student POST] Got:", computedTokenHash);
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 400 }
      );
    }

    // Check token expiration (7 days)
    if (tokenCreated) {
      const tokenCreatedDate = new Date(tokenCreated);
      const daysSinceCreation = (Date.now() - tokenCreatedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 7) {
        return NextResponse.json(
          { error: "Verification token has expired. Please register again." },
          { status: 400 }
        );
      }
    }

    // Hash password (using bcrypt or similar - for now, store as-is and hash in future)
    // Note: In production, you should hash the password before storing
    // Reuse crypto import from above
    const passwordHash = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    // Update student: set password, mark as verified, clear verification token
    // Using server token should allow us to set all fields including verified
    const updateBody: any = {
      password: passwordHash,
      verified: true,
    };
    
    // Clear token from metadata if it's there, otherwise clear from direct fields
    if (metadata.verification_token_hash) {
      updateBody.metadata = {
        verification_token_hash: null,
        verification_token_created: null,
      };
    } else {
      updateBody.verification_token_hash = null;
      updateBody.verification_token_created = null;
    }
    
    const updateRes = await fetch(
      `${normalizedBase}items/${STUDENT_COLLECTION}/${studentId}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${serverToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateBody),
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

