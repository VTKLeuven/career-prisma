// app/actions/companies.ts
"use server";
import { listCompanies, getCompanyById, createCompany, updateCompany, getCompaniesForEvent } from "@/lib/repos/company";
import { createRep, updateRep, waitForApproval, deleteUser, fetchPendingApprovalRequests, fetchSalespersonByID, type PendingApprovalRequest } from "@/lib/repos/users";
import { Company, CompanyRep, CareerEventOption, type UserSummary } from "@/lib/schema";
import { sendEmail } from "@/lib/email";
import { uploadFile } from "@/lib/file-storage";
import { getUserFromCookies, requireAdminUser } from "@/lib/auth-server";
import { fetchMastersAction } from "@/app/actions/features";
import { generateCompanyPageRequestEmailHtml, generateCVBookRequestEmailHtml } from "@/lib/email-templates";
import { fetchSalespersonsAction } from "@/app/actions/salespeople";
import prisma from "@/lib/prisma";
type AppUser = UserSummary;



function formatAddress(c: Company) {
  const parts = [
    [c.address_street, c.address_number].filter(Boolean).join(" ").trim(),
    [c.address_zip, c.address_city].filter(Boolean).join(" ").trim(),
    c.address_country,
  ]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter((p) => p.length > 0);

  return parts.length ? parts.join(", ") : "Not set";
}

/**
 * Check if company has all required information filled in for publishing
 * Required fields: name, VAT, all address fields, logo, short_description, website, location, at least one category
 * Excluded: page_image, long_description
 */
function isCompanyInfoComplete(company: Company): boolean {
  // Check name
  if (!company.name || company.name.trim().length === 0) {
    return false;
  }

  // Check VAT
  if (!company.VAT || company.VAT.trim().length === 0) {
    return false;
  }

  // Check all address fields
  if (!company.address_street || company.address_street.trim().length === 0) {
    return false;
  }
  if (!company.address_number || company.address_number.trim().length === 0) {
    return false;
  }
  if (!company.address_zip || company.address_zip.trim().length === 0) {
    return false;
  }
  if (!company.address_city || company.address_city.trim().length === 0) {
    return false;
  }
  if (!company.address_country || company.address_country.trim().length === 0) {
    return false;
  }

  // Check logo
  if (!company.logo || (typeof company.logo === "string" && company.logo.trim().length === 0)) {
    return false;
  }

  // Check short_description
  if (!company.short_description || company.short_description.trim().length === 0) {
    return false;
  }

  // Check website
  if (!company.website || company.website.trim().length === 0) {
    return false;
  }

  // Check location
  if (!company.location || company.location.trim().length === 0) {
    return false;
  }

  // Check category (at least one master category)
  if (!company.category || !Array.isArray(company.category) || company.category.length === 0) {
    return false;
  }

  return true;
}

export async function fetchCompaniesAction() {
  const companies = (await listCompanies({ limit: 10000, sort: "name" })) ?? [];

  return companies.map((c: Company) => ({
    id: c.id,
    name: c.name,
    address: formatAddress(c),
    VAT: c.VAT ?? "Not set",
    salesperson:
      typeof c.salesperson === "object" && c.salesperson
        ? `${c.salesperson.first_name ?? ""} ${c.salesperson.last_name ?? ""}`.trim() ||
        c.salesperson.id
        : typeof c.salesperson === "string" && c.salesperson
          ? c.salesperson
          : "Not set",
    status: c.status ?? "",
    // Include options and sub_options (company_career_sub_option junction)
    options: c.options ?? [],
    sub_options: (c as { sub_options?: unknown[] }).sub_options ?? [],
    option_history: c.option_history ?? [],
    sub_option_history: c.sub_option_history ?? [],
    category: c.category ?? [],
    representatives: c.representatives ?? [],
  }));
}

/** Extract all suboption IDs from companies (company.sub_options + options) */
function extractAllSubOptionIdsFromCompanies(companies: Awaited<ReturnType<typeof fetchCompaniesAction>>): (string | number)[] {
  const ids = new Set<string | number>();
  for (const c of companies ?? []) {
    const companySubs = (c as { sub_options?: unknown[] }).sub_options;
    if (Array.isArray(companySubs)) {
      for (const s of companySubs) {
        if (typeof s === "number" || typeof s === "string") ids.add(s);
        if (s && typeof s === "object" && "id" in s) ids.add((s as { id: string | number }).id);
      }
    }
    const opts = (c as { options?: unknown[] }).options ?? [];
    for (const opt of opts) {
      const junction = opt as { career_event_option_id?: { sub_options?: unknown[]; events?: Array<{ career_event_option_id?: { sub_options?: unknown[] } }> } };
      const option = junction?.career_event_option_id;
      if (!option) continue;
      const topLevel = option.sub_options;
      if (Array.isArray(topLevel)) {
        for (const s of topLevel) {
          if (typeof s === "number" || typeof s === "string") ids.add(s);
        }
      }
      const events = option.events;
      if (Array.isArray(events)) {
        for (const ev of events) {
          const nested = ev?.career_event_option_id?.sub_options;
          if (Array.isArray(nested)) {
            for (const s of nested) {
              if (typeof s === "number" || typeof s === "string") ids.add(s);
            }
          }
        }
      }
    }
  }
  return Array.from(ids);
}

/** Fetch companies + all suboptions (for resolving suboption IDs in admin). Also fetches by IDs found in options. */
export async function fetchCompaniesWithSubOptionsAction(): Promise<{
  companies: Awaited<ReturnType<typeof fetchCompaniesAction>>;
  allSubOptions: import("@/lib/schema").CareerSubOption[];
}> {
  const companies = (await fetchCompaniesAction()) ?? [];
  const optionIds = extractAllSubOptionIdsFromCompanies(companies);
  const { listCareerSubOptions, getCareerSubOptionsByIds } = await import("@/lib/repos/option");
  const [allFromList, byIds] = await Promise.all([
    listCareerSubOptions({ limit: 500 }),
    optionIds.length > 0 ? getCareerSubOptionsByIds(optionIds) : Promise.resolve([]),
  ]);
  const byIdMap = new Map<string, import("@/lib/schema").CareerSubOption>();
  for (const s of byIds ?? []) {
    byIdMap.set(String(s.id), s);
  }
  for (const s of allFromList ?? []) {
    if (!byIdMap.has(String(s.id))) byIdMap.set(String(s.id), s);
  }
  const allSubOptions = Array.from(byIdMap.values());
  return { companies, allSubOptions };
}

export async function fetchCompanyByIdAction(company_id: string, usePublic = false, useServerClient = false): Promise<Company | null> {
  try {
    const company = (await getCompanyById(company_id, usePublic, 2, useServerClient)) as Company | null;
    return company;
  } catch (error) {
    console.error("[fetchCompanyByIdAction] Error fetching company:", error);
    // Return null instead of throwing to prevent UI crashes
    return null;
  }
}

import { slugifyCompanyName } from "@/lib/utils/slugify";

function slugifyName(name?: string | null): string {
  return slugifyCompanyName(name);
}

export async function fetchCompaniesForEventAction(eventId: string, usePublic = false) {
  try {
    return await getCompaniesForEvent(eventId, usePublic);
  } catch (error) {
    console.error("[fetchCompaniesForEventAction] Error fetching companies for event:", error);
    return [];
  }
}

/** Debug: returns raw options structure + allSubOptions + junction discovery for a company */
export async function fetchCompanyOptionsDebugAction(companyId: string): Promise<{
  options: unknown;
  allSubOptions?: unknown[];
  junctionDiscovery?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const [company, allSubOptions, { getCareerSubOptionsByIds }] = await Promise.all([
      fetchCompanyByIdAction(companyId),
      import("@/lib/repos/option").then((m) => m.listCareerSubOptions({ limit: 50 })),
      import("@/lib/repos/option"),
    ]);
    if (!company) return { options: null, error: "Company not found" };
    const ids = extractSubOptionIdsFromCompany(company);
    const byIds = ids.length > 0 ? await getCareerSubOptionsByIds(ids) : [];
    const junctionDiscovery: Record<string, unknown> =
      ids.length > 0 && byIds.length === 0
        ? { error: "No matching career sub-options found in Prisma" }
        : {};
    return { options: company.options ?? [], allSubOptions: allSubOptions ?? [], junctionDiscovery: Object.keys(junctionDiscovery).length ? junctionDiscovery : undefined };
  } catch (e) {
    return { options: null, error: String(e) };
  }
}

/** Extract career_sub_option IDs from company (company.sub_options or nested in options).
 * IMPORTANT: For junction rows (company.sub_options), we must ONLY use career_sub_option_id/career_sub_option.
 * The junction row's "id" is its primary key - using it would send wrong IDs to Directus PATCH. */
function extractSubOptionIdsFromCompany(company: Company | null): (string | number)[] {
  const extractIdFromJunction = (s: unknown): string | number | null => {
    if (typeof s === "string" || typeof s === "number") return s;
    if (s && typeof s === "object") {
      if ("career_sub_option_id" in s) {
        const ref = (s as { career_sub_option_id?: { id?: string | number } | string | number | null }).career_sub_option_id;
        if (typeof ref === "string" || typeof ref === "number") return ref;
        if (ref && typeof ref === "object" && ref.id != null) return ref.id;
      }
      if ("career_sub_option" in s) {
        const ref = (s as { career_sub_option?: { id?: string | number } | string | number | null }).career_sub_option;
        if (typeof ref === "string" || typeof ref === "number") return ref;
        if (ref && typeof ref === "object" && ref.id != null) return ref.id;
      }
    }
    return null;
  };
  const extractIdFromOption = (s: unknown): string | number | null => {
    const fromJunction = extractIdFromJunction(s);
    if (fromJunction != null) return fromJunction;
    if (s && typeof s === "object" && "id" in s) return (s as { id: string | number }).id;
    return null;
  };
  const ids = new Set<string | number>();

  // Company-level sub_options (company_career_sub_option junction) - NEVER use junction row "id"
  const companySubs = (company as { sub_options?: unknown[] })?.sub_options;
  if (Array.isArray(companySubs)) {
    for (const s of companySubs) {
      const id = extractIdFromJunction(s);
      if (id != null) ids.add(id);
    }
  }

  if (!company?.options || !Array.isArray(company.options)) return Array.from(ids);
  for (const opt of company.options) {
    const junction = opt as { career_event_option_id?: { sub_options?: unknown[]; events?: Array<{ career_event_option_id?: { sub_options?: unknown[] } }> } };
    const option = junction?.career_event_option_id;
    if (!option) continue;
    const topLevel = option.sub_options;
    if (Array.isArray(topLevel)) {
      for (const s of topLevel) {
        const id = extractIdFromOption(s);
        if (id != null) ids.add(id);
      }
    }
    const events = option.events;
    if (Array.isArray(events)) {
      for (const ev of events) {
        const nested = ev?.career_event_option_id?.sub_options;
        if (Array.isArray(nested)) {
          for (const s of nested) {
            const id = extractIdFromOption(s);
            if (id != null) ids.add(id);
          }
        }
      }
    }
  }
  return Array.from(ids);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchCompanyBySlugAction(slugOrId: string): Promise<Company | null> {
  const trimmed = slugOrId.trim();
  // If param looks like a UUID or numeric ID, fetch by ID directly (more reliable for matching software links)
  if (UUID_REGEX.test(trimmed) || /^\d+$/.test(trimmed)) {
    const company = await fetchCompanyByIdAction(trimmed, false, true);
    if (company) return company;
    return null;
  }

  // Decode URL-encoded chars (e.g. %2B -> +, %20 -> space) then normalize for matching
  let decodedSlug = slugOrId;
  try {
    decodedSlug = decodeURIComponent(slugOrId);
  } catch {
    // Keep original if malformed encoding
  }
  const normalizedSlug = slugifyName(decodedSlug);

  // Fetch enough companies to find by slug (use server client when no user - public role may lack permission)
  const companies = (await listCompanies({ limit: 10000, sort: "name", useServerClient: true })) ?? [];

  const match = companies.find((c: Company) => {
    const companySlug = slugifyName(c.name);
    return companySlug === normalizedSlug;
  });

  if (!match) return null;

  // Fetch full company details with all relations (use server client for nested options - public role may lack permission)
  return fetchCompanyByIdAction(match.id, false, true);
}

/** Fetch company by slug + suboptions for access check (resolves IDs from options) */
export async function fetchCompanyBySlugWithSubOptionsAction(slug: string): Promise<{
  company: Company | null;
  allSubOptions: import("@/lib/schema").CareerSubOption[];
}> {
  const company = await fetchCompanyBySlugAction(slug);
  const ids = extractSubOptionIdsFromCompany(company);
  const { listCareerSubOptions, getCareerSubOptionsByIds } = await import("@/lib/repos/option");
  const [allFromList, byIds] = await Promise.all([
    listCareerSubOptions({ limit: 500 }),
    ids.length > 0 ? getCareerSubOptionsByIds(ids) : Promise.resolve([]),
  ]);
  const byIdMap = new Map<string, import("@/lib/schema").CareerSubOption>();
  for (const s of byIds ?? []) {
    byIdMap.set(String(s.id), s);
  }
  for (const s of allFromList ?? []) {
    if (!byIdMap.has(String(s.id))) byIdMap.set(String(s.id), s);
  }
  return { company, allSubOptions: Array.from(byIdMap.values()) };
}

/** Fetch speakers for a company (representatives who speak at events) */
export async function fetchSpeakersForCompanyAction(companyId: string) {
  const { getSpeakersForCompany } = await import("@/lib/repos/event");
  return getSpeakersForCompany(companyId);
}

export async function createCompanyAction(companyPayload: Partial<Company>, repPayload?: Partial<CompanyRep>) {
  await requireAdminUser();

  if (repPayload && (repPayload.email || repPayload.first_name || repPayload.last_name)) {
    let newRep: any;
    try {
      newRep = await createRep(repPayload);
    } catch (err) {
      console.error("[createCompanyAction] Failed to create representative:", repPayload.email, err);
      throw err instanceof Error ? err : new Error("Failed to create representative");
    }

    console.log(`[createCompanyAction] Representative created successfully: ${newRep.id} (${repPayload.email})`);

    const updatedRep = await updateRep(newRep.id, {
      first_name: repPayload.first_name,
      last_name: repPayload.last_name,
    });

    // Use newRep.id since updatedRep might be null if update failed
    // The user is created successfully even if the name update fails
    const repIdForCompany = updatedRep?.id || newRep.id;

    if (!updatedRep) {
      console.warn(`[createCompanyAction] Failed to update rep details for ${newRep.id}, but continuing with user creation...`);
    }

    // Create a mutable payload with representatives as string array for the API
    const payload = {
      ...companyPayload,
      representatives: [repIdForCompany] as unknown as CompanyRep[]
    };

    const createdCompany = await createCompany(payload as Partial<Company>);
    await prisma.user.update({
      where: { id: repIdForCompany },
      data: { company_id: createdCompany.id },
    });

    // Send invitation email to the representative
    if (repPayload.email && newRep?.id) {
      try {
        console.log(`[createCompanyAction] Generating invite token for user ${newRep.id} (${repPayload.email})`);

        // Generate secure invite token
        const { generateInviteToken } = await import("@/lib/repos/users");
        const tokenData = await generateInviteToken(newRep.id);

        if (tokenData && tokenData.token) {
          console.log(`[createCompanyAction] Token generated successfully for ${repPayload.email}`);

          // Build accept invite URL with token
          const frontendBaseUrl = process.env.NEXT_PUBLIC_APP_URL
            || process.env.NEXT_PUBLIC_FORM_DOMAIN
            || "http://localhost:3000";

          const acceptInviteUrl = `${frontendBaseUrl}/accept-invite?token=${encodeURIComponent(tokenData.token)}`;

          // Send custom invitation email using our SMTP setup
          const { sendEmail } = await import("@/lib/email");
          const { generateInvitationEmailHtml } = await import("@/lib/email-templates");

          const emailHtml = generateInvitationEmailHtml({
            firstName: repPayload.first_name ?? undefined,
            lastName: repPayload.last_name ?? undefined,
            companyName: companyPayload.name,
            acceptInviteUrl,
          });

          await sendEmail({
            to: repPayload.email,
            subject: `Welcome to VTK Career Platform${companyPayload.name ? ` - ${companyPayload.name}` : ''}`,
            html: emailHtml,
          });

          console.log(`[createCompanyAction] Invitation email sent to ${repPayload.email}`);
        } else {
          console.error(`[createCompanyAction] Failed to generate invite token for user ${newRep.id} (${repPayload.email}) - tokenData is null or missing token`);
        }
      } catch (err) {
        console.error(`[createCompanyAction] Error sending invitation email to ${repPayload.email}:`, err);
        if (err instanceof Error) {
          console.error(`[createCompanyAction] Error stack:`, err.stack);
        }
        // Don't throw - email failure shouldn't prevent company creation
      }
    }

    return createdCompany;
  }
  return await createCompany(companyPayload);
}

export async function createCompanyRepAction(companyId: string, repPayload: Partial<CompanyRep>) {
  await requireAdminUser();
  if (!repPayload) return null;
  let newRep: any;
  try {
    newRep = await createRep(repPayload);
  } catch (err) {
    console.error("[createCompanyRepAction] Failed to create representative:", repPayload.email, err);
    return null;
  }

  await updateRep(newRep.id, {
    first_name: repPayload.first_name,
    last_name: repPayload.last_name,
    company: { id: companyId } as Company,
  });

  const company = await fetchCompanyByIdAction(companyId);

  if (!company) { return; }

  // Build representatives array as string IDs
  let representativeIds: string[] = [];

  if (company.representatives) {
    // If representatives is an array of objects with id property, extract the ids
    representativeIds = (company.representatives as (CompanyRep | string)[]).map((item: CompanyRep | string) => {
      return typeof item === 'string' ? item : item?.id ?? '';
    });
  }

  // Add the new rep
  representativeIds.push(newRep.id);

  console.log(representativeIds)

  const result = await updateCompanyAction(companyId, { representatives: representativeIds as unknown as CompanyRep[] });

  // Send invitation email to the representative
  if (repPayload.email && newRep?.id) {
    try {
      console.log(`[createCompanyRepAction] Generating invite token for user ${newRep.id} (${repPayload.email})`);

      // Generate secure invite token
      const { generateInviteToken } = await import("@/lib/repos/users");
      const tokenData = await generateInviteToken(newRep.id);

      if (tokenData && tokenData.token) {
        console.log(`[createCompanyRepAction] Token generated successfully for ${repPayload.email}`);

        // Build accept invite URL with token
        const frontendBaseUrl = process.env.NEXT_PUBLIC_APP_URL
          || process.env.NEXT_PUBLIC_FORM_DOMAIN
          || "http://localhost:3000";

        const acceptInviteUrl = `${frontendBaseUrl}/accept-invite?token=${encodeURIComponent(tokenData.token)}`;

        // Send custom invitation email using our SMTP setup
        const { sendEmail } = await import("@/lib/email");
        const { generateInvitationEmailHtml } = await import("@/lib/email-templates");

        const emailHtml = generateInvitationEmailHtml({
          firstName: repPayload.first_name ?? undefined,
          lastName: repPayload.last_name ?? undefined,
          companyName: company.name,
          acceptInviteUrl,
        });

        await sendEmail({
          to: repPayload.email,
          subject: `Welcome to VTK Career Platform${company.name ? ` - ${company.name}` : ''}`,
          html: emailHtml,
        });

        console.log(`[createCompanyRepAction] Invitation email sent to ${repPayload.email}`);
      } else {
        console.error(`[createCompanyRepAction] Failed to generate invite token for user ${newRep.id} (${repPayload.email}) - tokenData is null or missing token`);
      }
    } catch (err) {
      console.error(`[createCompanyRepAction] Error sending invitation email to ${repPayload.email}:`, err);
      if (err instanceof Error) {
        console.error(`[createCompanyRepAction] Error stack:`, err.stack);
      }
      // Don't throw - email failure shouldn't prevent rep creation
    }
  }

  return result;
}

export async function requestRepAction(repPayload: Partial<CompanyRep>) {
  if (!repPayload) throw new Error("No rep payload");
  const currentUser = await getUserFromCookies();
  if (!currentUser?.company || currentUser.company.id !== repPayload.company?.id) {
    throw new Error("Unauthorized");
  }

  const salespersonId = typeof repPayload?.company?.salesperson === "string"
    ? repPayload.company.salesperson
    : repPayload?.company?.salesperson && typeof repPayload.company.salesperson === "object"
      ? repPayload.company.salesperson.id
      : undefined;

  if (!salespersonId) {
    throw new Error("Salesperson ID not found");
  }

  if (!repPayload.company?.id) {
    throw new Error("Company ID not found");
  }

  if (!repPayload.email) {
    throw new Error("Email is required");
  }

  // 1️⃣ Create approval request and wait for salesperson's approval
  const approved = await waitForApproval(salespersonId, repPayload);

  if (!approved) {
    return { status: "pending" };
  }

  // Fetch company details (needed for email and adding to representatives)
  const company = await fetchCompanyByIdAction(repPayload.company.id);
  if (!company) {
    throw new Error("Company not found");
  }

  // Check if user already exists (might have been created by approveRepRequestAction)
  const existingUser = await prisma.user.findUnique({
    where: { email: repPayload.email.trim().toLowerCase() },
  });
  let userId: string | undefined = existingUser?.id;

  // If user doesn't exist, create it (fallback for cases where approval happened but user wasn't created)
  if (!userId) {
    console.log(`[requestRepAction] Creating user for ${repPayload.email}`);
    let newRep: any;
    try {
      newRep = await createRep(repPayload);
    } catch (err) {
      console.error("[requestRepAction] Failed to create representative:", repPayload.email, err);
      throw err instanceof Error ? err : new Error("Failed to create user");
    }

    userId = newRep.id;

    // Update the rep data (name, etc.)
    await updateRep(newRep.id, {
      first_name: repPayload.first_name,
      last_name: repPayload.last_name,
      tel: repPayload.tel,
      title: repPayload.title,
    });

    // Send invitation email (same process as first rep)
    if (repPayload.email && newRep.id) {
      try {
        console.log(`[requestRepAction] Generating invite token for user ${newRep.id} (${repPayload.email})`);

        // Generate secure invite token
        const { generateInviteToken } = await import("@/lib/repos/users");
        const tokenData = await generateInviteToken(newRep.id);

        if (tokenData && tokenData.token) {
          console.log(`[requestRepAction] Token generated successfully for ${repPayload.email}`);

          // Build accept invite URL with token
          const frontendBaseUrl = process.env.NEXT_PUBLIC_APP_URL
            || process.env.NEXT_PUBLIC_FORM_DOMAIN
            || "http://localhost:3000";

          const acceptInviteUrl = `${frontendBaseUrl}/accept-invite?token=${encodeURIComponent(tokenData.token)}`;

          // Send custom invitation email using our SMTP setup
          const { sendEmail } = await import("@/lib/email");
          const { generateInvitationEmailHtml } = await import("@/lib/email-templates");

          const emailHtml = generateInvitationEmailHtml({
            firstName: repPayload.first_name ?? undefined,
            lastName: repPayload.last_name ?? undefined,
            companyName: company.name,
            acceptInviteUrl,
          });

          await sendEmail({
            to: repPayload.email,
            subject: `Welcome to VTK Career Platform${company.name ? ` - ${company.name}` : ''}`,
            html: emailHtml,
          });

          console.log(`[requestRepAction] Invitation email sent to ${repPayload.email}`);
        } else {
          console.error(`[requestRepAction] Failed to generate invite token for user ${newRep.id} (${repPayload.email})`);
        }
      } catch (err) {
        console.error(`[requestRepAction] Error sending invitation email to ${repPayload.email}:`, err);
        // Don't throw - email failure shouldn't prevent user creation
      }
    }
  }

  // 3️⃣ Add the user to the company's representatives list (if not already added)

  // Build representatives array as string IDs
  let representativeIds: string[] = [];
  if (company.representatives) {
    representativeIds = (company.representatives as (CompanyRep | string)[]).map((item: CompanyRep | string) => {
      return typeof item === 'string' ? item : item?.id ?? '';
    }).filter(Boolean);
  }

  // Add the user if not already present
  if (userId && !representativeIds.includes(userId)) {
    representativeIds.push(userId);
    await updateCompanyAction(repPayload.company.id, {
      representatives: representativeIds as unknown as CompanyRep[]
    });
  }

  return { id: userId, email: repPayload.email };
}

export async function updateCompanyAction(
  id: string,
  payload: Partial<Company>
): Promise<Company | null> {
  const user = await getUserFromCookies();
  if (!user?.admin && user?.company?.id !== id) {
    throw new Error("Unauthorized");
  }
  const res = await updateCompany(id, payload);
  return res as Company | null;
}

export async function setupCompanyAction(
  companyId: string,
  payload: Partial<Company>,
  selectedMasters: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUserFromCookies();
    if (!user?.admin && user?.company?.id !== companyId) {
      return { success: false, error: "Unauthorized" };
    }
    // Fetch masters to get full master objects
    const masters = await fetchMastersAction();

    // Build category payload from selected master IDs
    const categoryPayload = masters
      .filter((m) => selectedMasters.includes(m.id))
      .map((m) => ({ master_id: m.id }));

    // Update company with all fields and set status to published
    const updatePayload: Partial<Company> = {
      ...payload,
      category: categoryPayload as unknown as Company['category'],
      status: "published",
    };

    const updated = await updateCompanyAction(companyId, updatePayload);

    if (!updated) {
      return { success: false, error: "Failed to update company" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error setting up company:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function uploadCompanyLogo(file: File) {
  const user = await getUserFromCookies();
  if (!user) throw new Error("Unauthorized");
  return await uploadFile(file, user.id);
}

export async function addOptionToCompanyAction(companyId: string, optionId: string, subOptionIds?: string[]) {
  await requireAdminUser();
  const { createOptionSale } = await import("@/lib/repos/option-sales");
  await createOptionSale({ companyId, optionId, subOptionIds });
  return fetchCompanyByIdAction(companyId);
}

/** Extract sub_option IDs from a junction entry (handles various Directus formats) */
function getSubOptionIdsFromJunction(opt: unknown): string[] {
  if (!opt || typeof opt !== 'object' || !('sub_options' in opt)) return [];
  const subOpts = (opt as { sub_options?: unknown[] }).sub_options;
  if (!Array.isArray(subOpts)) return [];
  return subOpts
    .map((s) => {
      if (typeof s === 'string') return s;
      if (s && typeof s === 'object' && 'id' in s) return (s as { id: string }).id;
      if (s && typeof s === 'object' && 'career_sub_option_id' in s) {
        const ref = (s as { career_sub_option_id: string | { id: string } | null }).career_sub_option_id;
        return typeof ref === 'string' ? ref : ref?.id ?? '';
      }
      return '';
    })
    .filter(Boolean);
}

/** Build option junctions preserving sub_options and junction id for Directus update */
function buildOptionJunctions(company: Company): Array<{ id?: string | number; career_event_option_id: string; sub_options?: string[] }> {
  if (!company.options || !Array.isArray(company.options)) return [];
  return (company.options as unknown[]).map((opt) => {
    let optId = '';
    let junctionId: string | number | undefined;
    if (opt && typeof opt === 'object' && 'career_event_option_id' in opt) {
      const junction = opt as { id?: string | number; career_event_option_id: CareerEventOption | string | null };
      junctionId = junction.id;
      optId = typeof junction.career_event_option_id === 'string'
        ? junction.career_event_option_id
        : (junction.career_event_option_id as { id?: string })?.id ?? '';
    } else if (opt && typeof opt === 'object' && 'id' in opt) {
      const o = opt as { id: string };
      optId = o.id ?? '';
    }
    const subIds = getSubOptionIdsFromJunction(opt).map((id) => String(id));
    const result: { id?: string | number; career_event_option_id: string; sub_options?: string[] } = { career_event_option_id: optId };
    if (junctionId != null) result.id = junctionId;
    if (subIds.length > 0) result.sub_options = subIds;
    return result;
  }).filter((j) => j.career_event_option_id);
}

/** Add sub-option via company_career_sub_option junction (company.sub_options M2M) */
async function addSubOptionViaJunction(companyId: string, subOptionId: string): Promise<boolean> {
  const subOption = Number(subOptionId);
  if (!Number.isSafeInteger(subOption)) return false;
  const { assertAcademicYearWritable, resolveAcademicYearId } = await import("@/lib/repos/academic-year");
  const academicYearId = await assertAcademicYearWritable(await resolveAcademicYearId());
  const definition = await prisma.careerSubOption.findUnique({ where: { id: subOption } });
  if (!definition) return false;
  await prisma.companyCareerSubOption.upsert({
    where: {
      company_id_career_sub_option_id_academic_year_id: {
        company_id: companyId,
        career_sub_option_id: subOption,
        academic_year_id: academicYearId,
      },
    },
    create: {
      company_id: companyId,
      career_sub_option_id: subOption,
      academic_year_id: academicYearId,
      price_at_sale: definition.price,
      name_at_sale: definition.name,
    },
    update: {
      status: "sold",
      price_at_sale: definition.price,
      name_at_sale: definition.name,
      date_created: new Date(),
    },
  });
  return true;
}

/** Remove sub-option via company_career_sub_option junction */
async function removeSubOptionViaJunction(companyId: string, subOptionId: string): Promise<boolean> {
  const subOption = Number(subOptionId);
  if (!Number.isSafeInteger(subOption)) return false;
  const { assertAcademicYearWritable, resolveAcademicYearId } = await import("@/lib/repos/academic-year");
  const academicYearId = await assertAcademicYearWritable(await resolveAcademicYearId());
  await prisma.companyCareerSubOption.updateMany({
    where: { company_id: companyId, career_sub_option_id: subOption, academic_year_id: academicYearId },
    data: { status: "cancelled" },
  });
  return true;
}

/** Add sub-option to company without requiring an option (company-level only). */
export async function addSubOptionToCompanyOnlyAction(companyId: string, subOptionId: string): Promise<Company | null> {
  await requireAdminUser();
  return addSubOptionToCompanyAction(companyId, "", subOptionId);
}

/** Remove sub-option from company (works for both option-scoped and company-level). */
export async function removeSubOptionFromCompanyOnlyAction(companyId: string, subOptionId: string): Promise<Company | null> {
  await requireAdminUser();
  return removeSubOptionFromCompanyAction(companyId, "", subOptionId);
}

export async function addSubOptionToCompanyAction(companyId: string, optionId: string, subOptionId: string): Promise<Company | null> {
  await requireAdminUser();
  const company = await fetchCompanyByIdAction(companyId);
  if (!company) return null;

  const subIdStr = String(subOptionId);
  const existingIds = extractSubOptionIdsFromCompany(company);
  if (existingIds.some((id) => String(id) === subIdStr)) return company; // Already has it

  const viaJunction = await addSubOptionViaJunction(companyId, subIdStr);
  if (viaJunction) {
    return fetchCompanyByIdAction(companyId);
  }

  return null;
}

export async function removeSubOptionFromCompanyAction(companyId: string, optionId: string, subOptionId: string): Promise<Company | null> {
  await requireAdminUser();
  const company = await fetchCompanyByIdAction(companyId);
  if (!company) return null;

  const subIdStr = String(subOptionId);
  const existingIds = extractSubOptionIdsFromCompany(company);
  if (!existingIds.some((id) => String(id) === subIdStr)) return company; // Already doesn't have it

  const viaJunction = await removeSubOptionViaJunction(companyId, subIdStr);
  if (viaJunction) {
    return fetchCompanyByIdAction(companyId);
  }

  return company;
}

export async function removeOptionFromCompanyAction(companyId: string, optionId: string) {
  await requireAdminUser();
  const { assertAcademicYearWritable, resolveAcademicYearId } = await import("@/lib/repos/academic-year");
  const academicYearId = await assertAcademicYearWritable(await resolveAcademicYearId());
  await prisma.companyCareerEventOption.updateMany({
    where: {
      company_id: companyId,
      career_event_option_id: optionId,
      academic_year_id: academicYearId,
    },
    data: { status: "cancelled" },
  });
  return fetchCompanyByIdAction(companyId);
}

export async function removeUserFromCompanyAction(companyId: string, userId: string) {
  await requireAdminUser();
  const company = await fetchCompanyByIdAction(companyId);

  if (!company) return { success: false, error: "Company not found" };

  // Build representatives array as string IDs, excluding the user to remove
  let representativeIds: string[] = [];

  if (company.representatives) {
    // If representatives is an array of objects with id property, extract the ids
    representativeIds = (company.representatives as (CompanyRep | string)[])
      .map((item: CompanyRep | string) => {
        return typeof item === 'string' ? item : item?.id ?? '';
      })
      .filter(id => id && id !== userId);
  }

  // Get the salesperson ID to reassign files to (if available)
  let reassignToUserId: string | null = null;
  if (company.salesperson) {
    if (typeof company.salesperson === 'string') {
      reassignToUserId = company.salesperson;
    } else if (typeof company.salesperson === 'object' && company.salesperson?.id) {
      reassignToUserId = company.salesperson.id;
    }
  }

  // Update company to remove the user from representatives first
  const updateResult = await updateCompanyAction(companyId, { representatives: representativeIds as unknown as CompanyRep[] });

  if (!updateResult) {
    return { success: false, error: "Failed to update company" };
  }

  // Archive the user and reassign owned files to the salesperson when possible.
  const deleteResult = await deleteUser(userId, reassignToUserId || undefined);

  return deleteResult.success
    ? { success: true }
    : { success: false, error: deleteResult.error || "Failed to delete user" };
}

// Resend invitation email to a user
export async function resendInviteAction(userId: string, companyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminUser();
    // Verify user exists and is in "invited" status
    const company = await fetchCompanyByIdAction(companyId);
    if (!company) {
      return { success: false, error: "Company not found" };
    }

    // Find the user in the company's representatives
    const user = company.representatives?.find((rep: CompanyRep | string) => {
      const repId = typeof rep === 'string' ? rep : rep?.id;
      return repId === userId;
    });

    if (!user) {
      return { success: false, error: "User not found in company" };
    }

    const userObj = typeof user === 'string' ? null : user;
    const userStatus = userObj?.status;

    // Only allow resending invites for users with "invited" status
    if (userStatus !== "invited") {
      return { success: false, error: `Cannot resend invite: user status is "${userStatus}", not "invited"` };
    }

    const userEmail = userObj?.email;
    if (!userEmail) {
      return { success: false, error: "User email not found" };
    }

    console.log(`[resendInviteAction] Resending invite to user ${userId} (${userEmail})`);

    // Generate new invite token
    const { generateInviteToken } = await import("@/lib/repos/users");
    const tokenData = await generateInviteToken(userId);

    if (!tokenData || !tokenData.token) {
      return { success: false, error: "Failed to generate invite token" };
    }

    console.log(`[resendInviteAction] Token generated successfully for ${userEmail}`);

    // Build accept invite URL with token
    const frontendBaseUrl = process.env.NEXT_PUBLIC_APP_URL
      || process.env.NEXT_PUBLIC_FORM_DOMAIN
      || "http://localhost:3000";

    const acceptInviteUrl = `${frontendBaseUrl}/accept-invite?token=${encodeURIComponent(tokenData.token)}`;

    // Send custom invitation email using our SMTP setup
    const { generateInvitationEmailHtml } = await import("@/lib/email-templates");

    const emailHtml = generateInvitationEmailHtml({
      firstName: userObj.first_name ?? undefined,
      lastName: userObj.last_name ?? undefined,
      companyName: company.name,
      acceptInviteUrl,
    });

    await sendEmail({
      to: userEmail,
      subject: `Welcome to VTK Career Platform${company.name ? ` - ${company.name}` : ''}`,
      html: emailHtml,
    });

    console.log(`[resendInviteAction] Invitation email resent to ${userEmail}`);
    return { success: true };
  } catch (err) {
    console.error(`[resendInviteAction] Error resending invitation:`, err);
    if (err instanceof Error) {
      console.error(`[resendInviteAction] Error stack:`, err.stack);
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to resend invitation" };
  }
}

// Fetch pending approval requests for the current salesperson
// This is a convenience wrapper that ensures we use the authenticated user's ID
// All authorization is handled in fetchPendingApprovalRequests()
export async function fetchPendingApprovalRequestsAction(): Promise<PendingApprovalRequest[]> {
  try {
    const user = await getUserFromCookies();
    if (!user || !user.id) {
      return [];
    }

    const isSalesperson = user.role === "Administrator" ||
      user.role === "VTK Career";
    if (!user.admin && !isSalesperson) return [];

    // fetchPendingApprovalRequests will validate authorization server-side
    // and ensure the user can only see their own requests (unless they're an admin)
    return await fetchPendingApprovalRequests(user.id);
  } catch (error) {
    // Silently return empty array for unauthorized users (company reps)
    // Only log actual errors, not permission denials
    if (error instanceof Error && !error.message.includes("Unauthorized") && !error.message.includes("not a salesperson")) {
      console.error("Failed to fetch pending approval requests (action):", error.message, error.stack);
    }
    return [];
  }
}

// Helper function to create user from approved request (can be called from multiple places)
// This follows the same process as the first representative: creates user, sends invitation email with token
async function createUserFromApprovedRequest(request: any): Promise<void> {
  try {
    if (!request.company?.id) {
      console.error("[createUserFromApprovedRequest] No company ID in request");
      return;
    }

    if (!request.email) {
      console.error("[createUserFromApprovedRequest] No email in request");
      return;
    }

    // Fetch company details
    const company = await fetchCompanyByIdAction(request.company.id);
    if (!company) {
      console.error("[createUserFromApprovedRequest] Company not found:", request.company.id);
      return;
    }

    // Use default company rep role if role is not available in request
    const DEFAULT_COMPANY_REP_ROLE = "d5475bf4-a77f-48de-b06c-fac199b0f631";
    const userRole = request.role || DEFAULT_COMPANY_REP_ROLE;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: request.email.trim().toLowerCase() },
    });

    let userId: string | undefined;
    let isNewUser = false;

    if (existingUser) {
        // User already exists - use existing user ID
        userId = existingUser.id;
        console.log(`[createUserFromApprovedRequest] User already exists: ${userId} (${request.email})`);

        // Update user status to "invited" if it's not already set
        // Also update role if needed
        try {
          const updatePayload: any = {};
          if (existingUser.status !== "invited") {
            updatePayload.status = "invited";
          }
          if (existingUser.role_id !== userRole) {
            updatePayload.role_id = userRole;
          }

          if (Object.keys(updatePayload).length > 0) {
            await prisma.user.update({
              where: { id: userId },
              data: updatePayload,
            });
          }
        } catch (err) {
          console.warn(`[createUserFromApprovedRequest] Error updating existing user:`, err);
        }
    } else {
        // User doesn't exist, create it
        isNewUser = true;
        console.log(`[createUserFromApprovedRequest] Creating new user for ${request.email}`);

        const repPayload: Partial<CompanyRep> = {
          email: request.email,
          role: userRole,
          first_name: request.first_name || undefined,
          last_name: request.last_name || undefined,
          tel: request.tel || undefined,
          title: request.title || undefined,
          company: company,
        };

        let newRep: any;
        try {
          newRep = await createRep(repPayload);
        } catch (err) {
          console.error(`[createUserFromApprovedRequest] Failed to create user for ${request.email}:`, err);
          return; // Failed to create user
        }

        userId = newRep.id;
        console.log(`[createUserFromApprovedRequest] User created successfully: ${userId}`);

        // Update rep details (name, etc.)
        await updateRep(newRep.id, {
          first_name: request.first_name || undefined,
          last_name: request.last_name || undefined,
          tel: request.tel || undefined,
          title: request.title || undefined,
        });
    }

    if (!userId) {
      console.error(`[createUserFromApprovedRequest] No user ID available for ${request.email}`);
      return;
    }

    // Send invitation email with invite token (same process as first rep)
    if (request.email && userId) {
      try {
        console.log(`[createUserFromApprovedRequest] Generating invite token for user ${userId} (${request.email})`);

        // Generate secure invite token
        const { generateInviteToken } = await import("@/lib/repos/users");
        const tokenData = await generateInviteToken(userId);

        if (tokenData && tokenData.token) {
          console.log(`[createUserFromApprovedRequest] Token generated successfully for ${request.email}`);

          // Build accept invite URL with token
          const frontendBaseUrl = process.env.NEXT_PUBLIC_APP_URL
            || process.env.NEXT_PUBLIC_FORM_DOMAIN
            || "http://localhost:3000";

          const acceptInviteUrl = `${frontendBaseUrl}/accept-invite?token=${encodeURIComponent(tokenData.token)}`;

          // Send custom invitation email using our SMTP setup
          const { sendEmail } = await import("@/lib/email");
          const { generateInvitationEmailHtml } = await import("@/lib/email-templates");

          const emailHtml = generateInvitationEmailHtml({
            firstName: request.first_name ?? undefined,
            lastName: request.last_name ?? undefined,
            companyName: company.name,
            acceptInviteUrl,
          });

          await sendEmail({
            to: request.email,
            subject: `Welcome to VTK Career Platform${company.name ? ` - ${company.name}` : ''}`,
            html: emailHtml,
          });

          console.log(`[createUserFromApprovedRequest] Invitation email sent to ${request.email}`);
        } else {
          console.error(`[createUserFromApprovedRequest] Failed to generate invite token for user ${userId} (${request.email}) - tokenData is null or missing token`);
        }
      } catch (err) {
        console.error(`[createUserFromApprovedRequest] Error sending invitation email to ${request.email}:`, err);
        if (err instanceof Error) {
          console.error(`[createUserFromApprovedRequest] Error stack:`, err.stack);
        }
        // Don't throw - email failure shouldn't prevent user creation
      }
    }
  } catch (error) {
    console.error("[createUserFromApprovedRequest] Error creating user from approved request:", error);
    if (error instanceof Error) {
      console.error("[createUserFromApprovedRequest] Error stack:", error.stack);
    }
  }
}

// Approve or reject a rep request
export async function approveRepRequestAction(
  requestId: string,
  action: 'approve' | 'reject'
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUserFromCookies();
    if (!user) return { success: false, error: "Unauthorized" };
    const id = Number(requestId);
    if (!Number.isSafeInteger(id)) {
      return { success: false, error: "Invalid request ID" };
    }
    const request = await prisma.companyUserRequest.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!request) {
      return { success: false, error: "Request not found" };
    }
    if (
      !user.admin &&
      request.company?.salesperson_id !== user.id
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const status = action === "approve" ? "approved" : "rejected";
    if (action === "approve" && request.email) {
      const duplicate = await prisma.user.findUnique({
        where: { email: request.email.trim().toLowerCase() },
        select: { id: true },
      });
      if (duplicate) {
        await prisma.companyUserRequest.update({
          where: { id },
          data: { status: "rejected" },
        });
        return {
          success: false,
          error: "A user with this email already exists",
        };
      }
    }
    await prisma.companyUserRequest.update({
      where: { id },
      data: { status },
    });

    if (action === "approve") {
      await createUserFromApprovedRequest({
        ...request,
        company: request.company
          ? { id: request.company.id, name: request.company.name }
          : null,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error in approveRepRequestAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function requestCompanyPageAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUserFromCookies();
    if (!user || !user.company) {
      return { success: false, error: "User not authenticated or no company associated" };
    }

    const company = await fetchCompanyByIdAction(user.company.id);
    if (!company) {
      return { success: false, error: "Company not found" };
    }

    // Check if company already has a page (via "Company Page On Platform" sub-option)
    const { hasCompanyPageAccess } = await import("@/lib/utils/company-access");
    const ids = extractSubOptionIdsFromCompany(company);
    const { getCareerSubOptionsByIds } = await import("@/lib/repos/option");
    const allSubOptions = ids.length > 0 ? await getCareerSubOptionsByIds(ids) : [];
    if (hasCompanyPageAccess(company, allSubOptions ?? [])) {
      return { success: false, error: "Company already has a page on the platform" };
    }

    // Get salesperson email
    let salespersonEmail: string | null = null;
    let salespersonName: string = "Salesperson";

    if (company.salesperson) {
      const salespersonId = typeof company.salesperson === "string"
        ? company.salesperson
        : company.salesperson.id;
      const salesperson = await prisma.user.findUnique({
        where: { id: salespersonId },
        select: { email: true, first_name: true, last_name: true },
      });
      if (salesperson) {
        salespersonEmail = salesperson.email;
        salespersonName =
          [salesperson.first_name, salesperson.last_name]
            .filter(Boolean)
            .join(" ") || "Salesperson";
      }
    }

    if (!salespersonEmail) {
      return { success: false, error: "Salesperson email not found" };
    }

    // Get requester info
    const requesterName = user.name || user.email;
    const requesterEmail = user.email;

    // Generate email HTML
    const emailHtml = generateCompanyPageRequestEmailHtml({
      companyName: company.name,
      requesterName,
      requesterEmail,
      salespersonName,
    });

    // Send email to salesperson
    await sendEmail({
      to: salespersonEmail,
      subject: `Company Page Request: ${company.name}`,
      html: emailHtml,
    });

    return { success: true };
  } catch (error) {
    console.error("Error in requestCompanyPageAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function requestCVBookAccessAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUserFromCookies();
    if (!user || !user.company) {
      return { success: false, error: "User not authenticated or no company associated" };
    }

    const company = await fetchCompanyByIdAction(user.company.id);
    if (!company) {
      return { success: false, error: "Company not found" };
    }

    // Check if company already has CV Book access
    const { hasCVBookAccess } = await import("@/lib/utils/company-access");
    if (hasCVBookAccess(company)) {
      return { success: false, error: "Company already has CV Book access" };
    }

    // Get salesperson email
    let salespersonEmail: string | null = null;
    let salespersonName: string = "Salesperson";

    if (company.salesperson) {
      const salespersonId = typeof company.salesperson === "string"
        ? company.salesperson
        : company.salesperson.id;
      const salesperson = await prisma.user.findUnique({
        where: { id: salespersonId },
        select: { email: true, first_name: true, last_name: true },
      });
      if (salesperson) {
        salespersonEmail = salesperson.email;
        salespersonName =
          [salesperson.first_name, salesperson.last_name]
            .filter(Boolean)
            .join(" ") || "Salesperson";
      }
    }

    if (!salespersonEmail) {
      return { success: false, error: "Salesperson email not found" };
    }

    // Get requester info
    const requesterName = user.name || user.email;
    const requesterEmail = user.email;

    // Generate email HTML
    const emailHtml = generateCVBookRequestEmailHtml({
      companyName: company.name,
      requesterName,
      requesterEmail,
      salespersonName,
    });

    // Send email to salesperson
    await sendEmail({
      to: salespersonEmail,
      subject: `CV Book Access Request: ${company.name}`,
      html: emailHtml,
    });

    return { success: true };
  } catch (error) {
    console.error("Error in requestCVBookAccessAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if a company exists by name (case-insensitive)
 */
async function companyExistsByName(name: string): Promise<boolean> {
  try {
    const companies = await listCompanies({ limit: 1000, sort: "name" });
    if (!companies) return false;

    const normalizedName = name.trim().toLowerCase();
    return companies.some((c: Company) => c.name?.trim().toLowerCase() === normalizedName);
  } catch (error) {
    console.error("Error checking if company exists:", error);
    return false;
  }
}

/**
 * Parse CSV content into array of objects
 * Handles quoted fields and commas within quoted values
 */
function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];

  // Simple CSV parser that handles quoted fields
  function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    values.push(current.trim());
    return values;
  }

  // Parse header
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));

  // Parse data rows, filtering out empty rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, ''));
    if (values.length !== headers.length) continue;

    // Skip if row is empty or all values are empty
    if (values.every(v => !v || v.trim() === '')) {
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Find salesperson by name (case-insensitive, supports "First Last" or "First Middle Last")
 */
function findSalespersonByName(salespersons: AppUser[], name: string): string | null {
  const normalizedName = name.trim().toLowerCase();
  const nameParts = normalizedName.split(/\s+/).filter(p => p.length > 0);

  if (nameParts.length === 0) {
    return null;
  }

  for (const salesperson of salespersons) {
    const firstName = (salesperson.first_name || '').trim().toLowerCase();
    const lastName = (salesperson.last_name || '').trim().toLowerCase();

    if (!firstName && !lastName) {
      continue;
    }

    // Exact match: "First Last" === "first last"
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName === normalizedName) {
      return salesperson.id;
    }

    // Match by first and last name parts (ignore middle names)
    // "John Middle Doe" matches "John Doe"
    if (nameParts.length >= 2) {
      const inputFirst = nameParts[0];
      const inputLast = nameParts[nameParts.length - 1];

      if (firstName === inputFirst && lastName === inputLast) {
        return salesperson.id;
      }
    }

    // Match by first name only (if only one part provided)
    if (nameParts.length === 1 && firstName === nameParts[0]) {
      return salesperson.id;
    }
  }

  return null;
}

/**
 * Map CSV/Excel row to company payload
 * Expected columns (CSV):
 * - companyName (required)
 * - salesperson (required) - should be salesperson name (e.g., "John Doe" or "John")
 * - vatNumber (optional)
 * - firstName (optional)
 * - lastName (optional)
 * - email (optional)
 * - street (optional)
 * - number (optional)
 * - zip (optional)
 * - city (optional)
 * - country (optional, defaults to BE)
 */
function mapCSVRowToCompany(
  row: Record<string, string>,
  salespersonNameToId: (name: string) => string | null
): {
  company: Partial<Company>;
  rep?: Partial<CompanyRep>;
  salespersonError?: string;
} | null {
  const companyName = row['companyName']?.trim();
  const salespersonName = row['salesperson']?.trim();

  // Required fields
  if (!companyName || !salespersonName) {
    return null;
  }

  // Resolve salesperson name to ID
  const salespersonId = salespersonNameToId(salespersonName);
  if (!salespersonId) {
    return {
      company: { name: companyName } as Partial<Company>,
      salespersonError: `Salesperson "${salespersonName}" not found`,
    };
  }

  const company: Partial<Company> = {
    name: companyName,
    salesperson: salespersonId,
    VAT: row['vatNumber']?.trim() || undefined,
    address_street: row['street']?.trim() || undefined,
    address_number: row['number']?.trim() || undefined,
    address_zip: row['zip']?.trim() || undefined,
    address_city: row['city']?.trim() || undefined,
    address_country: row['country']?.trim() || 'BE',
  };

  // Optional representative
  let rep: Partial<CompanyRep> | undefined = undefined;
  const firstName = row['firstName']?.trim();
  const lastName = row['lastName']?.trim();
  const email = row['email']?.trim();

  if (firstName || lastName || email) {
    rep = {
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      email: email || undefined,
      role: "d5475bf4-a77f-48de-b06c-fac199b0f631",
      status: "invited",
    };
  }

  return { company, rep };
}

/**
 * Process CSV file and create companies
 * Returns summary of created/skipped companies with detailed information
 */
export async function processCompaniesCSVAction(formData: FormData): Promise<{
  success: boolean;
  created: number;
  skipped: number;
  errors: string[];
  skippedCompanies: string[];
  createdCompanies: string[];
  message?: string;
  error?: string;
}> {
  await requireAdminUser();
  try {
    const file = formData.get('file') as File | null;
    if (!file) {
      return {
        success: false,
        created: 0,
        skipped: 0,
        errors: [],
        skippedCompanies: [],
        createdCompanies: [],
        error: "No file provided",
      };
    }

    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');

    if (!isCSV) {
      return {
        success: false,
        created: 0,
        skipped: 0,
        errors: [],
        skippedCompanies: [],
        createdCompanies: [],
        error: "Unsupported file format. Please upload a CSV file (.csv)",
      };
    }

    let rows: Record<string, string>[] = [];

    try {
      // Parse CSV file
      const csvContent = await file.text();
      rows = parseCSV(csvContent);
    } catch (parseError) {
      console.error("Error parsing file:", parseError);
      return {
        success: false,
        created: 0,
        skipped: 0,
        errors: [],
        skippedCompanies: [],
        createdCompanies: [],
        error: `Failed to parse file: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
      };
    }

    if (rows.length === 0) {
      return {
        success: false,
        created: 0,
        skipped: 0,
        errors: [],
        skippedCompanies: [],
        createdCompanies: [],
        error: "File is empty or invalid",
      };
    }

    // Fetch salespersons to create name-to-ID mapping
    let salespersons: AppUser[] = [];
    try {
      salespersons = await fetchSalespersonsAction() ?? [];
    } catch (error) {
      console.error("Error fetching salespersons:", error);
      return {
        success: false,
        created: 0,
        skipped: 0,
        errors: [],
        skippedCompanies: [],
        createdCompanies: [],
        error: `Failed to fetch salespersons: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    const salespersonNameToId = (name: string) => findSalespersonByName(salespersons, name);

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    const skippedCompanies: string[] = [];
    const createdCompanies: string[] = [];

    // Fetch all existing companies once to avoid multiple queries
    let existingCompanies: Company[] = [];
    try {
      existingCompanies = (await listCompanies({ limit: 10000, sort: "name" })) ?? [];
    } catch (error) {
      console.error("Error fetching existing companies:", error);
      // Continue anyway, but we'll check individually which is slower
    }

    const existingCompanyNames = new Set(
      existingCompanies.map(c => c.name?.trim().toLowerCase()).filter(Boolean)
    );

    // Process each row with better error handling
    const BATCH_SIZE = 50; // Process in batches to avoid timeout
    for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, rows.length);
      const batch = rows.slice(batchStart, batchEnd);

      for (let i = 0; i < batch.length; i++) {
        const rowIndex = batchStart + i;
        const row = batch[i];

        try {
          const mapped = mapCSVRowToCompany(row, salespersonNameToId);

          if (!mapped) {
            errors.push(`Row ${rowIndex + 2}: Missing required fields (companyName, salesperson)`);
            continue;
          }

          // Check for salesperson resolution error
          if (mapped.salespersonError) {
            const companyName = mapped.company.name || `Row ${rowIndex + 2}`;
            errors.push(`Row ${rowIndex + 2} (${companyName}): ${mapped.salespersonError}`);
            continue;
          }

          const { company, rep } = mapped;
          const companyName = company.name!;

          // Check if company already exists (use cache first)
          const normalizedCompanyName = companyName.trim().toLowerCase();
          let companyExists = existingCompanyNames.has(normalizedCompanyName);

          // If not found in cache and we haven't loaded all companies, check individually
          // This is a fallback for very large datasets
          if (!companyExists) {
            companyExists = await companyExistsByName(companyName);
            if (companyExists) {
              existingCompanyNames.add(normalizedCompanyName);
            }
          }

          if (companyExists) {
            skipped++;
            skippedCompanies.push(companyName);
            continue;
          }

          // Create company
          try {
            await createCompanyAction(company, rep);
            created++;
            createdCompanies.push(companyName);
            // Add to existing set to avoid duplicate checks
            existingCompanyNames.add(companyName.trim().toLowerCase());
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Row ${rowIndex + 2} (${companyName}): ${errorMsg}`);
          }
        } catch (error) {
          errors.push(`Row ${rowIndex + 2}: Unexpected error - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Small delay between batches to avoid overwhelming the server
      if (batchEnd < rows.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      success: true,
      created,
      skipped,
      errors,
      skippedCompanies,
      createdCompanies,
      message: `Successfully created ${created} companies, skipped ${skipped} duplicates.`,
    };
  } catch (error) {
    console.error("Error processing file:", error);
    return {
      success: false,
      created: 0,
      skipped: 0,
      errors: [],
      skippedCompanies: [],
      createdCompanies: [],
      error: error instanceof Error ? error.message : "Unknown error processing file",
    };
  }
}
