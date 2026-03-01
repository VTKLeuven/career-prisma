import { NextRequest, NextResponse } from "next/server";
import { readItems, updateItem } from "@directus/sdk";
import { getAdminDirectusClient } from "@/lib/directus";
import { getUserFromRequestWithRefresh } from "@/lib/auth-server";

function extractCompanyId(company: unknown): string | undefined {
  if (!company) return undefined;
  if (typeof company === "string") return company;
  if (typeof company === "object" && company !== null && "id" in company) {
    const id = (company as { id?: unknown }).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}

function extractId(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}

async function scanBelongsToCompany(opts: {
  client: ReturnType<typeof getAdminDirectusClient>;
  scan: { company_id?: unknown; scanned_by?: unknown };
  companyId: string;
  userId: string;
}): Promise<boolean> {
  const { client, scan, companyId, userId } = opts;

  const scanCompanyId = extractCompanyId(scan.company_id);
  if (scanCompanyId) return scanCompanyId === companyId;

  const scannedById = extractId(scan.scanned_by);
  if (!scannedById) return false;
  if (scannedById === userId) return true;

  try {
    const companies = (await client!.request(
      readItems("company", {
        fields: ["id", "representatives.id"],
        filter: { id: { _eq: companyId } },
        limit: 1,
      })
    )) as unknown as Array<{
      id: string;
      representatives?: Array<{ id?: string } | string>;
    }>;

    const reps = companies?.[0]?.representatives ?? [];
    return reps.some((r) => (typeof r === "string" ? r === scannedById : r?.id === scannedById));
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await context.params;

  const { user, cookiesToSet } = await getUserFromRequestWithRefresh(request);
  if (!user) {
    const res = NextResponse.json(
      { error: "Unauthorized. Please log in as a company representative." },
      { status: 401 }
    );
    for (const cookie of cookiesToSet) res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  }
  if (!user.company) {
    const res = NextResponse.json(
      { error: "Your account is signed in, but it is not linked to a company." },
      { status: 403 }
    );
    for (const cookie of cookiesToSet) res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  }

  const companyId = extractCompanyId(user.company);
  if (!companyId) {
    const res = NextResponse.json({ error: "Company ID not found." }, { status: 400 });
    for (const cookie of cookiesToSet) res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  }

  const client = getAdminDirectusClient();
  if (!client) {
    const res = NextResponse.json(
      { error: "Failed to connect to database. Please try again later." },
      { status: 500 }
    );
    for (const cookie of cookiesToSet) res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  }

  const scans = (await client.request(
    readItems("attendant_scans", {
      fields: [
        "id",
        "attendant_uuid",
        "scanned_at",
        "liked",
        "comment",
        "feedback_updated_at",
        "company_id",
        "scanned_by.id",
        "scanned_by.first_name",
        "scanned_by.last_name",
        "scanned_by.email",
        "form_response_id.data",
        "form_response_id.submitted_at",
      ],
      filter: { id: { _eq: scanId } },
      limit: 1,
    })
  )) as unknown as Array<{
    id: string;
    attendant_uuid: string;
    scanned_at: string;
    liked?: boolean;
    comment?: string | null;
    feedback_updated_at?: string | null;
    company_id?: string | { id: string } | null;
    scanned_by?: { id?: string; first_name: string | null; last_name: string | null; email: string } | null;
    form_response_id?: { data: Record<string, unknown>; submitted_at: string } | null;
  }>;

  if (!scans.length) {
    const res = NextResponse.json({ error: "Scan not found" }, { status: 404 });
    for (const cookie of cookiesToSet) res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  }

  const scan = scans[0];
  const belongs = await scanBelongsToCompany({
    client,
    scan,
    companyId,
    userId: user.id,
  });
  if (!belongs) {
    const res = NextResponse.json({ error: "Scan not found" }, { status: 404 });
    for (const cookie of cookiesToSet) res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  }

  const scannedByEmail = scan.scanned_by?.email ?? "";
  const scannedByName =
    scan.scanned_by?.first_name || scan.scanned_by?.last_name
      ? `${scan.scanned_by?.first_name ?? ""} ${scan.scanned_by?.last_name ?? ""}`.trim()
      : scannedByEmail || "Unknown";

  const res = NextResponse.json({
    ...scan,
    scanned_by: {
      name: scannedByName || "Unknown",
      email: scannedByEmail || "Unknown",
    },
  });
  for (const cookie of cookiesToSet) res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await context.params;

  const { user, cookiesToSet } = await getUserFromRequestWithRefresh(request);
  if (!user) {
    const res = NextResponse.json(
      { error: "Unauthorized. Please log in as a company representative." },
      { status: 401 }
    );
    for (const cookie of cookiesToSet) res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  }
  if (!user.company) {
    const res = NextResponse.json(
      { error: "Your account is signed in, but it is not linked to a company." },
      { status: 403 }
    );
    for (const cookie of cookiesToSet) res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  }

  const companyId = extractCompanyId(user.company);
  if (!companyId) {
    const res = NextResponse.json({ error: "Company ID not found." }, { status: 400 });
    for (const cookie of cookiesToSet) res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  }

  const client = getAdminDirectusClient();
  if (!client) {
    const res = NextResponse.json(
      { error: "Failed to connect to database. Please try again later." },
      { status: 500 }
    );
    for (const cookie of cookiesToSet) res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  }

  const body = (await request.json().catch(() => ({}))) as { liked?: unknown; comment?: unknown };
  const liked = typeof body.liked === "boolean" ? body.liked : undefined;
  const comment = typeof body.comment === "string" ? body.comment : undefined;

  // Ensure scan belongs to this company
  const existing = (await client.request(
    readItems("attendant_scans", {
      fields: ["id", "company_id", "scanned_by.id"],
      filter: { id: { _eq: scanId } },
      limit: 1,
    })
  )) as unknown as Array<{ id: string; company_id?: unknown; scanned_by?: unknown }>;

  if (!existing.length) {
    const res = NextResponse.json({ error: "Scan not found" }, { status: 404 });
    for (const cookie of cookiesToSet) res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  }

  const belongs = await scanBelongsToCompany({
    client,
    scan: existing[0],
    companyId,
    userId: user.id,
  });
  if (!belongs) {
    const res = NextResponse.json({ error: "Scan not found" }, { status: 404 });
    for (const cookie of cookiesToSet) res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  }

  await client.request(
    updateItem("attendant_scans", scanId, {
      ...(typeof liked === "boolean" ? { liked } : {}),
      ...(typeof comment === "string" ? { comment } : {}),
      feedback_updated_at: new Date().toISOString(),
    })
  );

  // Return updated scan payload
  return GET(request, context);
}

