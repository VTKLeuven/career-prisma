// app/api/auth/oauth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyOAuthState, getRequestOrigin } from "@/lib/oauth";
import { findStudentByEmail, findStudentByUsername, createStudentFromOAuth, updateStudentOAuthToken, updateStudentOAuthData } from "@/lib/repos/students";

interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  [key: string]: unknown;
}

interface OAuthUserInfo {
  id?: string;
  username?: string;
  email?: string;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  // Helper function to get redirectTo from cookie
  const getRedirectToFromCookie = async (): Promise<string> => {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      return cookieStore.get("oauth_redirect_to")?.value || "/";
    } catch {
      return "/";
    }
  };

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Get OAuth configuration (matching Docker config naming)
    const tokenUrl = process.env.LITUS_OAUTH_TOKEN || process.env.OAUTH_TOKEN_URL;
    const userInfoUrl = process.env.LITUS_OAUTH_RESOURCE_OWNER_DETAILS || process.env.OAUTH_USER_INFO_URL;
    const clientId = process.env.LITUS_API_KEY || process.env.OAUTH_CLIENT_ID;
    const clientSecret = process.env.LITUS_SECRET || process.env.OAUTH_CLIENT_SECRET;
    const origin = getRequestOrigin(request);
    const callbackUrl = process.env.OAUTH_CALLBACK_URL || `${origin}/api/auth/oauth/callback`;
    const frontendUrl =
      process.env.NEXT_PUBLIC_FORM_DOMAIN ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.FRONTEND_URL ||
      origin;

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error, errorDescription);
      const frontendCallbackUrl = new URL("/auth/callback", frontendUrl);
      frontendCallbackUrl.searchParams.set("error", error);
      if (errorDescription) {
        frontendCallbackUrl.searchParams.set("error_description", errorDescription);
      }
      const redirectTo = await getRedirectToFromCookie();
      frontendCallbackUrl.searchParams.set("redirect_to", redirectTo);
      return NextResponse.redirect(frontendCallbackUrl.toString());
    }

    // Verify required parameters
    if (!code || !state) {
      const frontendCallbackUrl = new URL("/auth/callback", frontendUrl);
      frontendCallbackUrl.searchParams.set("error", "missing_parameters");
      frontendCallbackUrl.searchParams.set("error_description", "Missing code or state parameter");
      const redirectTo = await getRedirectToFromCookie();
      frontendCallbackUrl.searchParams.set("redirect_to", redirectTo);
      return NextResponse.redirect(frontendCallbackUrl.toString());
    }

    // Verify configuration
    if (!tokenUrl || !userInfoUrl || !clientId) {
      console.error("Missing OAuth configuration:", {
        tokenUrl: !!tokenUrl,
        userInfoUrl: !!userInfoUrl,
        clientId: !!clientId,
        clientSecret: !!clientSecret,
      });
      const frontendCallbackUrl = new URL("/auth/callback", frontendUrl);
      frontendCallbackUrl.searchParams.set("error", "configuration_error");
      const redirectTo = await getRedirectToFromCookie();
      frontendCallbackUrl.searchParams.set("redirect_to", redirectTo);
      return NextResponse.redirect(frontendCallbackUrl.toString());
    }
    
    // Note: Some OAuth providers (like LITUS) may not require client_secret
    // If your provider doesn't need it, the token exchange will fail and we'll handle it gracefully

    // Verify state (CSRF protection)
    const stateVerification = await verifyOAuthState(state);
    if (!stateVerification.valid) {
      console.error("Invalid OAuth state");
      const frontendCallbackUrl = new URL("/auth/callback", frontendUrl);
      frontendCallbackUrl.searchParams.set("error", "invalid_state");
      frontendCallbackUrl.searchParams.set("error_description", "The authentication session expired. Please try logging in again.");
      // Preserve redirectTo from the state verification even when state is invalid
      frontendCallbackUrl.searchParams.set("redirect_to", stateVerification.redirectTo || "/");
      return NextResponse.redirect(frontendCallbackUrl.toString());
    }

    // Exchange authorization code for access token
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl,
      client_id: clientId,
      ...(clientSecret && { client_secret: clientSecret }),
    });

    let tokenResponse: Response;
    try {
      tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: tokenParams.toString(),
      });
    } catch (fetchError) {
      console.error("Token request error:", fetchError);
      const frontendCallbackUrl = new URL("/auth/callback", frontendUrl);
      frontendCallbackUrl.searchParams.set("error", "token_request_failed");
      frontendCallbackUrl.searchParams.set("redirect_to", stateVerification.redirectTo || "/");
      return NextResponse.redirect(frontendCallbackUrl.toString());
    }

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token response error:", tokenResponse.status, errorText);
      const frontendCallbackUrl = new URL("/auth/callback", frontendUrl);
      frontendCallbackUrl.searchParams.set("error", "token_exchange_failed");
      frontendCallbackUrl.searchParams.set("error_description", `Status: ${tokenResponse.status}`);
      frontendCallbackUrl.searchParams.set("redirect_to", stateVerification.redirectTo || "/");
      return NextResponse.redirect(frontendCallbackUrl.toString());
    }

    const tokenData = (await tokenResponse.json()) as OAuthTokenResponse;
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("No access token in response:", tokenData);
      const frontendCallbackUrl = new URL("/auth/callback", frontendUrl);
      frontendCallbackUrl.searchParams.set("error", "no_access_token");
      frontendCallbackUrl.searchParams.set("redirect_to", stateVerification.redirectTo || "/");
      return NextResponse.redirect(frontendCallbackUrl.toString());
    }

    // Fetch user info from OAuth provider
    let userInfo: OAuthUserInfo = {};
    try {
      const userInfoResponse = await fetch(userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (userInfoResponse.ok) {
        userInfo = (await userInfoResponse.json()) as OAuthUserInfo;
      } else {
        console.warn("Failed to fetch user info:", userInfoResponse.status);
        const frontendCallbackUrl = new URL("/auth/callback", frontendUrl);
        frontendCallbackUrl.searchParams.set("error", "user_info_failed");
        frontendCallbackUrl.searchParams.set("redirect_to", stateVerification.redirectTo || "/");
        return NextResponse.redirect(frontendCallbackUrl.toString());
      }
    } catch (userInfoError) {
      console.warn("User info request error:", userInfoError);
      const frontendCallbackUrl = new URL("/auth/callback", frontendUrl);
      frontendCallbackUrl.searchParams.set("error", "user_info_error");
      frontendCallbackUrl.searchParams.set("redirect_to", stateVerification.redirectTo || "/");
      return NextResponse.redirect(frontendCallbackUrl.toString());
    }

    // Validate required OAuth fields
    if (!userInfo.username || !userInfo.email) {
      console.error("Missing required OAuth fields:", userInfo);
      const frontendCallbackUrl = new URL("/auth/callback", frontendUrl);
      frontendCallbackUrl.searchParams.set("error", "missing_oauth_fields");
      frontendCallbackUrl.searchParams.set("redirect_to", stateVerification.redirectTo || "/");
      return NextResponse.redirect(frontendCallbackUrl.toString());
    }

    // Find or create student in database
    let student = await findStudentByUsername(userInfo.username) || await findStudentByEmail(userInfo.email);

    if (student) {
      // Update existing student with new token and latest data
      await updateStudentOAuthToken(student.id, {
        access_token: accessToken,
        expires_in: tokenData.expires_in,
      });
      await updateStudentOAuthData(student.id, {
        full_name: typeof userInfo.full_name === 'string' ? userInfo.full_name : undefined,
        email: typeof userInfo.email === 'string' ? userInfo.email : undefined,
        university_status: typeof userInfo.university_status === 'string' ? userInfo.university_status : undefined,
        university: "KU Leuven", // Always KU Leuven for LITUS OAuth
        organization_status: typeof userInfo.organization_status === 'string' ? userInfo.organization_status : undefined,
        in_workinggroup: typeof userInfo.in_workinggroup === 'boolean' ? userInfo.in_workinggroup : undefined,
      });
    } else {
      // Create new student
      student = await createStudentFromOAuth(
        {
          username: typeof userInfo.username === 'string' ? userInfo.username : '',
          full_name: typeof userInfo.full_name === 'string' ? userInfo.full_name : undefined,
          email: typeof userInfo.email === 'string' ? userInfo.email : '',
          university_status: typeof userInfo.university_status === 'string' ? userInfo.university_status : undefined,
          university: "KU Leuven", // Always KU Leuven for LITUS OAuth
          organization_status: typeof userInfo.organization_status === 'string' ? userInfo.organization_status : undefined,
          in_workinggroup: typeof userInfo.in_workinggroup === 'boolean' ? userInfo.in_workinggroup : undefined,
        },
        {
          access_token: accessToken,
          expires_in: tokenData.expires_in,
        }
      );

      if (!student) {
        console.error("Failed to create student");
        const frontendCallbackUrl = new URL("/auth/callback", frontendUrl);
        frontendCallbackUrl.searchParams.set("error", "student_creation_failed");
        frontendCallbackUrl.searchParams.set("redirect_to", stateVerification.redirectTo || "/");
        return NextResponse.redirect(frontendCallbackUrl.toString());
      }
    }

    // Set student session cookie (store student ID)
    const STUDENT_SESSION_COOKIE = "student_session";
    
    // Calculate session expiration (match token expiration or default to 30 days)
    const sessionMaxAge = tokenData.expires_in 
      ? Math.min(tokenData.expires_in, 30 * 24 * 60 * 60) // Max 30 days
      : 30 * 24 * 60 * 60; // Default 30 days

    const url = new URL(request.url);
    const xfProto = (typeof request.headers.get === "function" && request.headers.get("x-forwarded-proto")) || "";
    const isSecure = url.protocol === "https:" || xfProto.includes("https") || process.env.NODE_ENV === "production";

    // Redirect to frontend callback with user data
    const frontendCallbackUrl = new URL("/auth/callback", frontendUrl);
    
    // Store user info and tokens in URL params (temporary, for debugging)
    const userInfoBase64 = Buffer.from(JSON.stringify(userInfo)).toString("base64url");
    const tokenInfoBase64 = Buffer.from(
      JSON.stringify({
        access_token: accessToken.substring(0, 20) + "...", // Masked for display
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope,
      })
    ).toString("base64url");

    frontendCallbackUrl.searchParams.set("user_info", userInfoBase64);
    frontendCallbackUrl.searchParams.set("token_info", tokenInfoBase64);
    frontendCallbackUrl.searchParams.set("student_id", student.id);
    frontendCallbackUrl.searchParams.set("redirect_to", stateVerification.redirectTo || "/");

    const response = NextResponse.redirect(frontendCallbackUrl.toString());
    
    // Set session cookie on the response
    response.cookies.set(STUDENT_SESSION_COOKIE, student.id, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: sessionMaxAge,
    });

    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    const origin = getRequestOrigin(request);
    const frontendUrl =
      process.env.NEXT_PUBLIC_FORM_DOMAIN ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.FRONTEND_URL ||
      origin;
    const frontendCallbackUrl = new URL("/auth/callback", frontendUrl);
    frontendCallbackUrl.searchParams.set("error", "callback_error");
    frontendCallbackUrl.searchParams.set(
      "error_description",
      error instanceof Error ? error.message : "Unknown error"
    );
    // Try to get redirectTo from cookie in catch block
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const redirectTo = cookieStore.get("oauth_redirect_to")?.value || "/";
      frontendCallbackUrl.searchParams.set("redirect_to", redirectTo);
    } catch {
      frontendCallbackUrl.searchParams.set("redirect_to", "/");
    }
    return NextResponse.redirect(frontendCallbackUrl.toString());
  }
}

