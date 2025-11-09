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
        <html>
          <head>
            <title>${action === "approve" ? "Approving" : "Rejecting"} Request</title>
            <meta http-equiv="refresh" content="2;url=/login">
          </head>
          <body>
            <h1>Please log in to ${action === "approve" ? "approve" : "reject"} this request</h1>
            <p>Redirecting to login page...</p>
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

    // Return success page
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Request ${action === "approve" ? "Approved" : "Rejected"}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background-color: #f5f5f5;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              text-align: center;
            }
            .success {
              color: #4CAF50;
              font-size: 48px;
              margin-bottom: 20px;
            }
            .error {
              color: #f44336;
              font-size: 48px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="${action === "approve" ? "success" : "error"}">${action === "approve" ? "✅" : "❌"}</div>
            <h1>Request ${action === "approve" ? "Approved" : "Rejected"}</h1>
            <p>The user request has been ${action === "approve" ? "approved" : "rejected"} successfully.</p>
            ${action === "approve" ? "<p>The new user will receive an activation email shortly.</p>" : ""}
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

