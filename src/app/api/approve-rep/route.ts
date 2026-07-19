import { NextResponse, type NextRequest } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { generateInviteTokenServer } from "@/lib/invite-token";
import { sendEmail } from "@/lib/email";
import { generateInvitationEmailHtml } from "@/lib/email-templates";

const COMPANY_REP_ROLE_ID = "d5475bf4-a77f-48de-b06c-fac199b0f631";

export async function GET(request: NextRequest) {
  const requestId = Number(request.nextUrl.searchParams.get("requestId"));
  const action = request.nextUrl.searchParams.get("action");
  if (!Number.isSafeInteger(requestId) || !["approve", "reject"].includes(action || "")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = await getUserFromCookies();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const repRequest = await prisma.companyUserRequest.findUnique({
    where: { id: requestId },
    include: { company: true },
  });
  if (!repRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (
    !user.admin &&
    repRequest.company?.salesperson_id !== user.id
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await prisma.companyUserRequest.update({
    where: { id: requestId },
    data: { status: action === "approve" ? "approved" : "rejected" },
  });

  if (action === "approve" && repRequest.email) {
    const email = repRequest.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.companyUserRequest.update({
        where: { id: requestId },
        data: { status: "rejected" },
      });
      return new NextResponse(
        '<html><body><h1>Request rejected</h1><p>This email address is already in use.</p><p><a href="/admin/approvals">Return to approvals</a></p></body></html>',
        { status: 409, headers: { "Content-Type": "text/html" } }
      );
    }
    const representative = await prisma.user.create({
      data: {
        email,
        status: "invited",
        company_id: repRequest.company_id,
        role_id: COMPANY_REP_ROLE_ID,
        first_name: repRequest.first_name,
        last_name: repRequest.last_name,
        tel: repRequest.tel,
        title: repRequest.title,
      },
    });
    const invite = await generateInviteTokenServer(representative.id);
    if (invite) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_FORM_DOMAIN ||
        new URL(request.url).origin;
      const acceptInviteUrl = `${baseUrl}/accept-invite?token=${encodeURIComponent(invite.token)}`;
      await sendEmail({
        to: invite.email,
        subject: `Welcome to VTK Career Platform${repRequest.company?.name ? ` - ${repRequest.company.name}` : ""}`,
        html: generateInvitationEmailHtml({
          firstName: repRequest.first_name || undefined,
          lastName: repRequest.last_name || undefined,
          companyName: repRequest.company?.name || "",
          acceptInviteUrl,
        }),
      });
    }
  }

  return new NextResponse(
    `<html><body><h1>Request ${action === "approve" ? "approved" : "rejected"}</h1><p><a href="/admin/approvals">Return to approvals</a></p></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
