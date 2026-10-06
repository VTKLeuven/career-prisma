import { NextResponse, type NextRequest } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { approveRepRequestAction } from "@/app/actions/companies";

function page(status: number, title: string, message?: string) {
  return new NextResponse(
    `<html><body><h1>${title}</h1>${message ? `<p>${message}</p>` : ""}<p><a href="/admin/approvals">Return to approvals</a></p></body></html>`,
    { status, headers: { "Content-Type": "text/html" } }
  );
}

/**
 * The approve / reject links in the "new representative" email. Same rules
 * and effects as the buttons on /admin/approvals -- it calls the same action;
 * it used to be a second, drifted copy of the approval logic.
 */
export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get("requestId");
  const action = request.nextUrl.searchParams.get("action");
  if (!requestId || !Number.isSafeInteger(Number(requestId)) || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!(await getUserFromCookies())) {
    // Relative, for the same reason as api/cv-file: request.url may carry the
    // container's internal origin.
    return new NextResponse(null, { status: 307, headers: { Location: "/login" } });
  }

  const result = await approveRepRequestAction(requestId, action);
  if (result.success) {
    return page(200, `Request ${action === "approve" ? "approved" : "rejected"}`);
  }
  if (result.error === "Request not found") {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (result.error === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (result.error === "A user with this email already exists") {
    return page(409, "Request rejected", "This email address is already in use.");
  }
  return page(500, "Something went wrong", "The request could not be processed. Try again from the approvals page.");
}
