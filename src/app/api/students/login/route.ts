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

    // Debug: Log password field info (without exposing the full hash)
    console.log("[students/login] Password field exists:", !!student.password);
    console.log("[students/login] Password field length:", student.password?.length);
    console.log("[students/login] Password field prefix:", student.password?.substring(0, 20));

    // Check if password is SHA256 (64 hex chars) or Directus hash (Argon2id, bcrypt, etc.)
    const isArgon2Hash = student.password.startsWith('$argon2');
    const isBcryptHash = student.password.startsWith('$2a$') || student.password.startsWith('$2b$');
    const isDirectusHash = isArgon2Hash || isBcryptHash || 
                           (student.password.length > 64 && !/^[a-f0-9]{64}$/i.test(student.password));

    let passwordMatches = false;
    let matchedViaDoubleHashFallback = false;

    if (isDirectusHash) {
      if (isArgon2Hash) {
        // Directus uses Argon2id when password is set via UI
        try {
          // @ts-ignore - argon2 may not be installed
          const argon2 = await import("argon2").catch(() => null);
          if (argon2 && typeof argon2.verify === 'function') {
            console.log("[students/login] Attempting Argon2id verification");
            console.log("[students/login] Stored hash prefix:", student.password.substring(0, 30));
            passwordMatches = await argon2.verify(student.password, password);
            console.log("[students/login] Argon2id verification result:", passwordMatches);

            // Backwards-compatible fallback:
            // A previous bug stored argon2(sha256(password)) instead of argon2(password).
            // If the direct verification fails, try verifying sha256(password) against the stored hash.
            if (!passwordMatches) {
              const crypto = await import("crypto");
              const sha = crypto.createHash("sha256").update(password).digest("hex");
              const fallbackOk = await argon2.verify(student.password, sha);
              console.log("[students/login] Argon2id fallback (sha256(password)) result:", fallbackOk);
              if (fallbackOk) {
                passwordMatches = true;
                matchedViaDoubleHashFallback = true;
              }
            }
          } else {
            throw new Error("argon2 not available");
          }
        } catch (argon2Error) {
          console.error("[students/login] Argon2 verification error:", argon2Error);
          console.error("[students/login] Error details:", argon2Error instanceof Error ? argon2Error.message : String(argon2Error));
          // Don't return error here - let it fall through to show password mismatch
          passwordMatches = false;
        }
      } else if (isBcryptHash) {
        // Directus might use bcrypt in some cases
        try {
          // @ts-ignore - bcryptjs may not be installed
          const bcrypt = await import("bcryptjs").catch(() => null);
          if (bcrypt && typeof bcrypt.compare === 'function') {
            passwordMatches = await bcrypt.compare(password, student.password);
            console.log("[students/login] Using bcrypt verification");

            // Backwards-compatible fallback for double-hashed passwords
            if (!passwordMatches) {
              const crypto = await import("crypto");
              const sha = crypto.createHash("sha256").update(password).digest("hex");
              const fallbackOk = await bcrypt.compare(sha, student.password);
              console.log("[students/login] Bcrypt fallback (sha256(password)) result:", fallbackOk);
              if (fallbackOk) {
                passwordMatches = true;
                matchedViaDoubleHashFallback = true;
              }
            }
          } else {
            throw new Error("bcryptjs not available");
          }
        } catch (bcryptError) {
          console.error("[students/login] Bcrypt verification failed:", bcryptError);
          console.error("[students/login] Install bcryptjs: npm install bcryptjs @types/bcryptjs");
          return NextResponse.json({ 
            error: "Password verification failed. Please contact support or reset your password." 
          }, { status: 401 });
        }
      }
    } else {
      // Assume SHA256 hash (64 hex characters) - used when password is set programmatically
      const crypto = await import("crypto");
      const passwordHash = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");
      passwordMatches = passwordHash === student.password;
      console.log("[students/login] Using SHA256 verification");
    }

    if (!passwordMatches) {
      console.error("[students/login] Password mismatch for student:", student.email);
      console.error("[students/login] Password hash type:", isDirectusHash ? "Directus (bcrypt/argon2)" : "SHA256");
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // If we matched using the fallback, repair the stored password so future logins work normally.
    if (matchedViaDoubleHashFallback) {
      try {
        console.warn("[students/login] Detected legacy double-hashed password. Re-hashing password correctly via Directus.");
        await fetch(`${normalizedBase}items/students/${student.id}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${serverToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        });
      } catch (e) {
        console.warn("[students/login] Failed to repair legacy password hash:", e);
      }
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

