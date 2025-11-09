// app/api/approve-rep/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get("requestId");
    const action = searchParams.get("action"); // "approve" or "reject"

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "Missing requestId or action parameter" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? 'directus'}_access`;
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE)?.value;

    if (!token) {
      // Return HTML page for unauthenticated users (email links)
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Authentication Required</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <meta http-equiv="refresh" content="3;url=/login">
          </head>
          <body class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-lg p-8 md:p-12 max-w-md w-full text-center">
              <div class="mb-6">
                <div class="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
              </div>
              <h1 class="text-2xl font-bold text-gray-900 mb-3">Authentication Required</h1>
              <p class="text-gray-600 mb-4">Please log in to ${action === "approve" ? "approve" : "reject"} this request.</p>
              <p class="text-sm text-gray-500 mb-6">Redirecting to login page...</p>
              <a href="/login" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors">
                Go to Login
              </a>
            </div>
          </body>
        </html>`,
        {
          status: 401,
          headers: { "Content-Type": "text/html" },
        }
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

    // Update the request status in Directus
    const status = action === "approve" ? "approved" : "rejected";
    const updateRes = await fetch(
      `${normalizedBase}items/company_user_requests/${requestId}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      }
    );

    if (!updateRes.ok) {
      const error = await updateRes.json().catch(() => null);
      console.error("Failed to update request status:", error);
      return NextResponse.json(
        { error: "Failed to update request status" },
        { status: 500 }
      );
    }

    // If approved, create the user (requestRepAction polling will also handle this,
    // but this ensures it works even if the polling has stopped)
    if (action === "approve") {
      try {
        // Fetch the request to get details for user creation
        const getRequestRes = await fetch(
          `${normalizedBase}items/company_user_requests/${requestId}?fields=*,company.id`,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          }
        );

        if (getRequestRes.ok) {
          const requestData = await getRequestRes.json();
          const request = requestData.data;

          if (request) {
            // Import and call the helper function to create user
            const { createUserFromApprovedRequest } = await import("@/app/actions/companies");
            await createUserFromApprovedRequest(request);
          }
        }
      } catch (createError) {
        // Log but don't fail - the requestRepAction polling might handle it
        console.error("Error in background user creation:", createError);
      }
    }

    // Return success page with site-consistent styling
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Request ${action === "approve" ? "Approved" : "Rejected"}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
            }
          </style>
        </head>
        <body class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-lg p-8 md:p-12 max-w-md w-full text-center">
            <div class="mb-6">
              ${action === "approve" 
                ? '<div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div>'
                : '<div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4"><svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></div>'
              }
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-3">Request ${action === "approve" ? "Approved" : "Rejected"}</h1>
            <p class="text-gray-600 mb-4">The user request has been ${action === "approve" ? "approved" : "rejected"} successfully.</p>
            ${action === "approve" 
              ? '<p class="text-sm text-gray-500 mb-6">The new user will receive an activation email shortly to set up their account.</p>'
              : '<p class="text-sm text-gray-500 mb-6">The user request has been declined.</p>'
            }
            <a href="/admin/approvals" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors">
              Go to Admin Panel
            </a>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (error) {
    console.error("Error in approve-rep route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

