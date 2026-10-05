import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import type { Company, Master, CareerEventOption, CareerEvent } from "@/lib/schema";
import { loadCompanyPage } from "@/lib/company-page-data";
import { loadHomepageData } from "@/lib/homepage-data";
import { hasCompanyPageAccess } from "@/lib/utils/company-access";
import { getCompanyEvents } from "@/lib/utils/company-events";
import { slugifyCompanyName } from "@/lib/utils/slugify";
import { CompanyPageClient } from "./company-page-client";

/**
 * /company/<name>: a company's public page, rendered on the server. It used to
 * render "Loading company..." and fetch the company, its speakers and every
 * event from the browser.
 */
type Params = Promise<{ companyName: string }>;

type CategoryJunction = { master_id: Master | null };
type OptionJunction = { career_event_option_id: CareerEventOption | null };

function isCategoryJunction(value: unknown): value is CategoryJunction {
  return typeof value === "object" && value !== null && "master_id" in value;
}

function isOptionJunction(value: unknown): value is OptionJunction {
  return typeof value === "object" && value !== null && "career_event_option_id" in value;
}

async function loadVisibleCompany(slug: string) {
  const data = await loadCompanyPage(slug);
  // Only companies with the company-page sub-option (and published) have a page.
  if (!data.company || !hasCompanyPageAccess(data.company, data.allSubOptions ?? [])) return null;
  return data;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { companyName } = await params;
  const data = await loadVisibleCompany(companyName);
  if (!data?.company) return {};
  return { title: data.company.name };
}

export default async function CompanyPage({ params }: { params: Params }) {
  const { companyName } = await params;

  // Redirect to the canonical slug if the URL has special chars (+, _, etc.)
  // so links work consistently.
  const canonicalSlug = slugifyCompanyName(companyName);
  if (canonicalSlug && companyName !== canonicalSlug) {
    permanentRedirect(`/company/${canonicalSlug}`);
  }

  const [data, homepage] = await Promise.all([loadVisibleCompany(companyName), loadHomepageData()]);

  // ./not-found.tsx explains, with a 404 status.
  if (!data?.company) notFound();

  const fetched = data.company;

  // Normalize categories and options
  const rawCategory: unknown[] = Array.isArray(fetched.category) ? (fetched.category as unknown[]) : [];
  const normalizedCategories: Master[] = rawCategory
    .filter(isCategoryJunction)
    .map((item) => item.master_id)
    .filter((m): m is Master => Boolean(m));

  const rawOptions: unknown[] = Array.isArray(fetched.options) ? (fetched.options as unknown[]) : [];
  const normalizedOptions: CareerEventOption[] = rawOptions
    .filter(isOptionJunction)
    .map((item) => item.career_event_option_id)
    .filter((o): o is CareerEventOption => Boolean(o));

  const company = {
    ...fetched,
    category: normalizedCategories,
    options: normalizedOptions,
  } as Company;

  // The public events this company attends (the homepage's cached list
  // holds every public event).
  const events = getCompanyEvents((homepage.events ?? []) as CareerEvent[], company);

  // Keyed so a client navigation to another company starts fresh.
  return <CompanyPageClient key={company.id} company={company} speakers={data.speakers} events={events} />;
}
